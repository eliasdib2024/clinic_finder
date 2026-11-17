import { tx } from '../lib/i18n';
// Administration: platform stats, verification, users, clinics and catalog.
import { ApiError, request, requireUser, newId, notify, logActivity } from './db';
import { doctorView, publicUser, nameOf } from './serializers';
import { cancelFutureFor } from './userService';
import { addDays, todayISO } from '../lib/dates';
import { GOVERNORATES, citiesOf, CLINIC_TYPES } from '../lib/constants';
import { required, lebanesePhone, normalizeLebanesePhone } from '../lib/validators';

const admin = (db) => requireUser(db, ['admin']);

export function getStats({ days = 14 } = {}) {
  return request((db) => {
    admin(db);
    const today = todayISO();
    const perDay = [];
    for (let i = -(days - 1); i <= 6; i++) {
      const date = addDays(today, i);
      const list = db.appointments.filter((a) => a.date === date);
      perDay.push({
        date, future: i > 0,
        total: list.length,
        completed: list.filter((a) => a.status === 'completed').length,
        upcoming: list.filter((a) => ['pending', 'confirmed'].includes(a.status)).length,
        cancelled: list.filter((a) => ['cancelled', 'declined', 'no-show'].includes(a.status)).length,
      });
    }
    const demand = db.catalog.specialties.map((s) => {
      const ids = new Set(db.doctors.filter((d) => d.specialtyId === s.id).map((d) => d.id));
      return { id: s.id, name: tx(s.name), bookings: db.appointments.filter((a) => ids.has(a.doctorId)).length, doctors: ids.size };
    }).sort((a, b) => b.bookings - a.bookings);
    const byGov = GOVERNORATES.map((g) => ({ id: g.id, name: tx(g.name), doctors: db.doctors.filter((d) => d.governorate === g.id && d.verification.status === 'approved').length }));
    const statusBreakdown = ['pending', 'confirmed', 'completed', 'cancelled', 'declined', 'no-show'].map((s) => ({ status: s, count: db.appointments.filter((a) => a.status === s).length }));
    const last30 = addDays(today, -30);
    return {
      totals: {
        patients: db.users.filter((u) => u.role === 'patient').length,
        activePatients: db.users.filter((u) => u.role === 'patient' && u.status === 'active').length,
        doctors: db.doctors.filter((d) => d.verification.status === 'approved').length,
        pendingVerifications: db.doctors.filter((d) => d.verification.status === 'pending').length,
        appointments: db.appointments.length,
        appointments30: db.appointments.filter((a) => a.date >= last30 && a.date <= today).length,
        prescriptions: db.prescriptions.length,
        clinics: db.clinics.length,
        suspended: db.users.filter((u) => u.status === 'suspended').length,
      },
      perDay, demand, byGov, statusBreakdown,
      activity: db.activity.slice(0, 12),
    };
  });
}

// ---------------- verification ----------------
export function listDoctorsByVerification(status = 'pending') {
  return request((db) => {
    admin(db);
    return db.doctors.filter((d) => status === 'all' || d.verification.status === status)
      .map((d) => doctorView(db, d, { withNext: false }))
      .sort((a, b) => (b.verification.submittedAt || '').localeCompare(a.verification.submittedAt || ''));
  });
}

export function setVerification(doctorId, status, reason = '') {
  return request((db) => {
    const a = admin(db);
    const d = db.doctors.find((x) => x.id === doctorId);
    if (!d) throw new ApiError(tx('Doctor not found.'), 404);
    if (!['approved', 'rejected'].includes(status)) throw new ApiError(tx('Unsupported status.'), 422);
    if (d.verification.status !== 'pending') throw new ApiError(tx('Only pending applications can be reviewed.'), 409);
    if (status === 'rejected' && String(reason).trim().length < 10) throw new ApiError(tx('Give the doctor a clear reason (at least 10 characters).'), 422, { reason: tx('Give a clear reason (at least 10 characters).') });
    const user = db.users.find((u) => u.id === d.userId);
    d.verification = { ...d.verification, status, reason: status === 'rejected' ? reason.trim() : '', reviewedAt: new Date().toISOString(), reviewedBy: a.id };
    notify(db, user.id, status === 'approved'
      ? { title: 'Profile verified', body: 'Your profile is now visible to patients and you can receive bookings.', link: '/doctor', kind: 'success' }
      : { title: 'Verification rejected', body: reason.trim(), link: '/doctor/profile', kind: 'warning' });
    logActivity(db, status === 'approved' ? '{0}’s application was approved' : '{0}’s application was rejected', 'verification', { 0: user.name });
    return doctorView(db, d, { withNext: false });
  });
}

// ---------------- users ----------------
export function listUsers({ role = 'all', status = 'all', q = '' } = {}) {
  return request((db) => {
    admin(db);
    const s = q.trim().toLowerCase();
    return db.users.filter((u) => u.role !== 'admin')
      .filter((u) => role === 'all' || u.role === role)
      .filter((u) => status === 'all' || u.status === status)
      .filter((u) => !s || [u.name, u.email, u.phone].some((x) => x?.toLowerCase().includes(s)))
      .map((u) => {
        const d = u.role === 'doctor' ? db.doctors.find((x) => x.userId === u.id) : null;
        const appts = db.appointments.filter((a) => a.patientId === u.id || (d && a.doctorId === d.id));
        return {
          ...publicUser(u),
          specialty: d ? tx(nameOf(db.catalog.specialties, d.specialtyId)) : null,
          verification: d?.verification.status || null,
          doctorId: d?.id || null,
          appointments: appts.length,
          upcoming: appts.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= todayISO()).length,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

/** Suspend or reactivate. Suspension cancels future bookings and ends sessions. */
export function setUserStatus(userId, status, reason = '') {
  return request((db) => {
    admin(db);
    const user = db.users.find((u) => u.id === userId);
    if (!user || user.role === 'admin') throw new ApiError(tx('User not found.'), 404);
    if (!['active', 'suspended'].includes(status)) throw new ApiError(tx('Unsupported status.'), 422);
    if (user.status === status) throw new ApiError(tx('This user is already {0}.', {
      0: status
    }), 409);
    let cancelled = 0;
    if (status === 'suspended') {
      cancelled = cancelFutureFor(db, user, 'Cancelled — account suspended');
      for (const [t, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[t];
    }
    user.status = status;
    user.statusReason = reason;
    logActivity(db, status === 'suspended' ? '{0} was suspended by an administrator' : '{0} was reactivated by an administrator', 'user', { 0: user.name });
    return { user: publicUser(user), cancelled };
  });
}

// ---------------- clinics ----------------
function validateClinic(db, c, id) {
  const errors = {};
  if (required(c.name) || c.name.trim().length < 3) errors.name = tx('Enter the clinic name (3+ characters).');
  else if (db.clinics.some((x) => x.id !== id && x.name.trim().toLowerCase() === c.name.trim().toLowerCase())) errors.name = tx('A clinic with this name already exists.');
  if (!CLINIC_TYPES.some((t) => t.id === c.type)) errors.type = tx('Choose a clinic type.');
  if (!GOVERNORATES.some((g) => g.id === c.governorate)) errors.governorate = tx('Choose a governorate.');
  if (!citiesOf(c.governorate).includes(c.city)) errors.city = tx('Choose a city in this governorate.');
  if (required(c.address) || c.address.trim().length < 5) errors.address = tx('Enter the street address.');
  const ph = lebanesePhone(c.phone);
  if (ph) errors.phone = ph;
  if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);
}

export function listClinics() {
  return request((db) => {
    admin(db);
    return db.clinics.map((c) => ({ ...c, doctors: db.doctors.filter((d) => d.clinicId === c.id).length })).sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function createClinic(data) {
  return request((db) => {
    admin(db);
    validateClinic(db, data);
    const c = { id: newId('c'), name: data.name.trim(), type: data.type, governorate: data.governorate, city: data.city, address: data.address.trim(), phone: normalizeLebanesePhone(data.phone), createdAt: new Date().toISOString() };
    db.clinics.push(c);
    logActivity(db, 'Clinic “{0}” was created', 'clinic', {
      0: c.name
    });
    return { ...c, doctors: 0 };
  });
}

export function updateClinic(id, data) {
  return request((db) => {
    admin(db);
    const c = db.clinics.find((x) => x.id === id);
    if (!c) throw new ApiError(tx('Clinic not found.'), 404);
    validateClinic(db, data, id);
    Object.assign(c, { name: data.name.trim(), type: data.type, governorate: data.governorate, city: data.city, address: data.address.trim(), phone: normalizeLebanesePhone(data.phone) });
    db.doctors.filter((d) => d.clinicId === id).forEach((d) => { d.governorate = c.governorate; d.city = c.city; });
    logActivity(db, 'Clinic “{0}” was updated', 'clinic', {
      0: c.name
    });
    return { ...c, doctors: db.doctors.filter((d) => d.clinicId === id).length };
  });
}

export function deleteClinic(id) {
  return request((db) => {
    admin(db);
    const c = db.clinics.find((x) => x.id === id);
    if (!c) throw new ApiError(tx('Clinic not found.'), 404);
    const linked = db.doctors.filter((d) => d.clinicId === id);
    if (linked.length) throw new ApiError(tx(linked.length === 1 ? '1 doctor practises here. Move them to another clinic before deleting.' : '{0} doctors practise here. Move them to another clinic before deleting.', { 0: linked.length }), 409);
    db.clinics = db.clinics.filter((x) => x.id !== id);
    logActivity(db, 'Clinic “{0}” was deleted', 'clinic', {
      0: c.name
    });
    return { ok: true };
  });
}

// ---------------- catalog ----------------
const CATALOG_KEYS = { specialties: 'specialty', insurers: 'insurer', languages: 'language' };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const usage = (db, key, id) => {
  if (key === 'specialties') return db.doctors.filter((d) => d.specialtyId === id).length;
  if (key === 'insurers') return db.doctors.filter((d) => d.insurances.includes(id)).length + db.users.filter((u) => u.patient?.insuranceId === id).length;
  return db.doctors.filter((d) => d.languages.includes(id)).length;
};

export function getCatalogWithUsage() {
  return request((db) => {
    admin(db);
    const out = {};
    for (const key of Object.keys(CATALOG_KEYS)) out[key] = db.catalog[key].map((x) => ({ ...x, usage: usage(db, key, x.id) }));
    return out;
  });
}

export function addCatalogItem(key, { name, icon }) {
  return request((db) => {
    admin(db);
    if (!CATALOG_KEYS[key]) throw new ApiError(tx('Unknown catalog.'), 404);
    const n = String(name || '').trim();
    if (n.length < 2) throw new ApiError(tx('Enter a name.'), 422, { name: tx('Enter a name (2+ characters).') });
    if (db.catalog[key].some((x) => x.name.toLowerCase() === n.toLowerCase())) throw new ApiError(tx('This entry already exists.'), 409, { name: tx('This entry already exists.') });
    let id = slug(n) || newId(CATALOG_KEYS[key]);
    while (db.catalog[key].some((x) => x.id === id)) id = `${id}-2`;
    const item = key === 'specialties' ? { id, name: n, icon: icon || 'Stethoscope' } : { id, name: n };
    db.catalog[key].push(item);
    logActivity(db, '{0} “{1}” added to the catalog', 'catalog', {
      0: CATALOG_KEYS[key][0].toUpperCase() + CATALOG_KEYS[key].slice(1),
      1: n
    });
    return { ...item, usage: 0 };
  });
}

export function updateCatalogItem(key, id, { name, icon }) {
  return request((db) => {
    admin(db);
    const item = db.catalog[key]?.find((x) => x.id === id);
    if (!item) throw new ApiError(tx('Entry not found.'), 404);
    const n = String(name || '').trim();
    if (n.length < 2) throw new ApiError(tx('Enter a name.'), 422, { name: tx('Enter a name (2+ characters).') });
    if (db.catalog[key].some((x) => x.id !== id && x.name.toLowerCase() === n.toLowerCase())) throw new ApiError(tx('This entry already exists.'), 409, { name: tx('This entry already exists.') });
    item.name = n;
    if (key === 'specialties' && icon) item.icon = icon;
    logActivity(db, 'Catalog entry renamed to “{0}”', 'catalog', {
      0: n
    });
    return { ...item, usage: usage(db, key, id) };
  });
}

export function deleteCatalogItem(key, id) {
  return request((db) => {
    admin(db);
    const item = db.catalog[key]?.find((x) => x.id === id);
    if (!item) throw new ApiError(tx('Entry not found.'), 404);
    const used = usage(db, key, id);
    if (key === 'specialties' && used) throw new ApiError(tx(used === 1 ? '1 doctor uses this specialty. Reassign them first.' : '{0} doctors use this specialty. Reassign them first.', { 0: used }), 409);
    if (key === 'languages' && db.catalog.languages.length <= 1) throw new ApiError(tx('Keep at least one language.'), 409);
    db.catalog[key] = db.catalog[key].filter((x) => x.id !== id);
    if (key === 'insurers') {
      db.doctors.forEach((d) => { d.insurances = d.insurances.filter((x) => x !== id); });
      db.users.forEach((u) => { if (u.patient?.insuranceId === id) { u.patient.insuranceId = ''; u.patient.insuranceNumber = ''; } });
    }
    if (key === 'languages') db.doctors.forEach((d) => { const rest = d.languages.filter((x) => x !== id); d.languages = rest.length ? rest : [db.catalog.languages[0].id]; });
    logActivity(db, 'Catalog entry “{0}” removed', 'catalog', {
      0: item.name
    });
    return { ok: true };
  });
}
