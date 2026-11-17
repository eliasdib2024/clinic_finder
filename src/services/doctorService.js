import { tx } from '../lib/i18n';
// Doctors: public search/profile/slots, and the doctor's own profile, schedule and patients.
import { ApiError, request, currentUser, requireUser, notify, logActivity } from './db';
import { doctorView, appointmentView, prescriptionView, nameOf } from './serializers';
import { generateSlots, availabilityMap, validateSchedule, BOOKING_WINDOW_DAYS } from '../lib/schedule';
import { todayISO, diffDays, timeToMinutes } from '../lib/dates';
import { fee as vFee, lebanesePhone, required } from '../lib/validators';
import { citiesOf, SLOT_LENGTHS } from '../lib/constants';

const visible = (db, d) => d.verification.status === 'approved' && db.users.find((u) => u.id === d.userId)?.status === 'active';

const groupAppts = (db) => {
  const map = {};
  for (const a of db.appointments) (map[a.doctorId] ||= []).push(a);
  return map;
};

export const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'soonest', label: 'Soonest appointment' },
  { id: 'rating', label: 'Highest rated' },
  { id: 'fee-asc', label: 'Fee: low to high' },
  { id: 'fee-desc', label: 'Fee: high to low' },
  { id: 'experience', label: 'Most experienced' },
];

/**
 * Search verified doctors.
 * filters: q, specialty, governorate, city, minFee, maxFee, languages[], insurances[], myInsurance,
 *          availability ('today'|'week'), minRating, minExperience, video, sort, page, pageSize
 */
export function searchDoctors(filters = {}) {
  return request((db) => {
    const me = currentUser(db);
    const myIns = me?.patient?.insuranceId;
    const byDoc = groupAppts(db);
    const today = todayISO();
    const q = (filters.q || '').trim().toLowerCase();

    let items = db.doctors.filter((d) => visible(db, d)).map((d) => doctorView(db, d, { apptsByDoctor: byDoc }));

    if (q) items = items.filter((d) => [d.name, d.specialty, d.city, d.location.name, d.governorateName].some((s) => s?.toLowerCase().includes(q)));
    if (filters.specialty) items = items.filter((d) => d.specialtyId === filters.specialty);
    if (filters.governorate) items = items.filter((d) => d.governorate === filters.governorate);
    if (filters.city) items = items.filter((d) => d.city === filters.city);
    if (filters.minFee !== undefined && filters.minFee !== '') items = items.filter((d) => d.fee >= Number(filters.minFee));
    if (filters.maxFee !== undefined && filters.maxFee !== '') items = items.filter((d) => d.fee <= Number(filters.maxFee));
    if (filters.languages?.length) items = items.filter((d) => filters.languages.every((l) => d.languages.includes(l)));
    if (filters.insurances?.length) items = items.filter((d) => filters.insurances.some((i) => d.insurances.includes(i)));
    if (filters.myInsurance && myIns) items = items.filter((d) => d.insurances.includes(myIns));
    if (filters.minRating) items = items.filter((d) => d.rating >= Number(filters.minRating));
    if (filters.minExperience) items = items.filter((d) => d.experience >= Number(filters.minExperience));
    if (filters.video) items = items.filter((d) => d.videoConsult);
    if (filters.availability === 'today') items = items.filter((d) => d.nextAvailable?.date === today);
    if (filters.availability === 'week') items = items.filter((d) => d.nextAvailable && diffDays(d.nextAvailable.date, today) < 7);

    const soonKey = (d) => (d.nextAvailable ? diffDays(d.nextAvailable.date, today) * 1440 + timeToMinutes(d.nextAvailable.time) : Infinity);
    const sorters = {
      recommended: (a, b) => (b.rating * 20 + Math.min(b.reviewsCount, 200) / 10 - (b.nextAvailable ? diffDays(b.nextAvailable.date, today) : 30)) - (a.rating * 20 + Math.min(a.reviewsCount, 200) / 10 - (a.nextAvailable ? diffDays(a.nextAvailable.date, today) : 30)),
      soonest: (a, b) => soonKey(a) - soonKey(b),
      rating: (a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount,
      'fee-asc': (a, b) => a.fee - b.fee,
      'fee-desc': (a, b) => b.fee - a.fee,
      experience: (a, b) => b.experience - a.experience,
    };
    items.sort(sorters[filters.sort] || sorters.recommended);

    const total = items.length;
    const pageSize = Number(filters.pageSize) || 12;
    const page = Math.max(1, Number(filters.page) || 1);
    return { items: items.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
  });
}

export function getFeaturedDoctors(limit = 6) {
  return request((db) => {
    const byDoc = groupAppts(db);
    return db.doctors.filter((d) => visible(db, d)).map((d) => doctorView(db, d, { apptsByDoctor: byDoc }))
      .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount).slice(0, limit);
  });
}

export function getDoctor(id) {
  return request((db) => {
    const d = db.doctors.find((x) => x.id === id);
    const me = currentUser(db);
    const isSelfOrAdmin = me && (me.role === 'admin' || me.id === d?.userId);
    if (!d || (!visible(db, d) && !isSelfOrAdmin)) throw new ApiError(tx('This doctor could not be found.'), 404);
    return doctorView(db, d);
  });
}

/** Free slots for a date. opts.ignoreAppointmentId frees one booking when rescheduling it. */
export function getSlots(doctorId, date, opts = {}) {
  return request((db) => {
    const d = db.doctors.find((x) => x.id === doctorId);
    if (!d) throw new ApiError(tx('Doctor not found.'), 404);
    return generateSlots(d, date, db.appointments.filter((a) => a.doctorId === d.id), opts);
  }, { latency: 160 });
}

/** date → free slot count, for the 14-day date strip. */
export function getAvailability(doctorId, days = BOOKING_WINDOW_DAYS, opts = {}) {
  return request((db) => {
    const d = db.doctors.find((x) => x.id === doctorId);
    if (!d) throw new ApiError(tx('Doctor not found.'), 404);
    return availabilityMap(d, db.appointments.filter((a) => a.doctorId === d.id), days, opts);
  }, { latency: 160 });
}

// ---------------- doctor (self) ----------------
const myDoctor = (db) => {
  const user = requireUser(db, ['doctor']);
  const d = db.doctors.find((x) => x.userId === user.id);
  if (!d) throw new ApiError(tx('Doctor profile not found.'), 404);
  return { user, d };
};

export function getMyDoctorProfile() {
  return request((db) => doctorView(db, myDoctor(db).d));
}

export function updateMyDoctorProfile(patch) {
  return request((db) => {
    const { d } = myDoctor(db);
    const errors = {};
    if ('fee' in patch && vFee(patch.fee)) errors.fee = vFee(patch.fee);
    if ('bio' in patch && String(patch.bio).length > 1200) errors.bio = tx('Keep your biography under 1,200 characters.');
    if ('languages' in patch && !patch.languages.length) errors.languages = tx('Select at least one language.');
    if ('governorate' in patch && !citiesOf(patch.governorate).includes(patch.city)) errors.city = tx('Choose a city in the selected governorate.');
    if ('experience' in patch && (Number(patch.experience) < 0 || Number(patch.experience) > 60)) errors.experience = tx('Enter years of experience between 0 and 60.');
    if (patch.clinicId === null && patch.practice) {
      if (required(patch.practice.name)) errors['practice.name'] = tx('Practice name is required.');
      if (required(patch.practice.address)) errors['practice.address'] = tx('Practice address is required.');
      if (patch.practice.phone && lebanesePhone(patch.practice.phone)) errors['practice.phone'] = lebanesePhone(patch.practice.phone);
    }
    if (patch.clinicId && !db.clinics.some((c) => c.id === patch.clinicId)) errors.clinicId = tx('Select a listed clinic.');
    if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);

    const allowed = ['bio', 'fee', 'languages', 'insurances', 'education', 'clinicId', 'practice', 'experience', 'governorate', 'city', 'videoConsult'];
    for (const k of allowed) if (k in patch) d[k] = k === 'fee' || k === 'experience' ? Number(patch[k]) : patch[k];
    if (patch.clinicId) {
      const c = db.clinics.find((x) => x.id === patch.clinicId);
      d.governorate = c.governorate; d.city = c.city;
    }
    // The name is changed from Settings only (userService.updateProfile); doctors have no picture.
    return doctorView(db, d);
  });
}

/** Save availability: { schedule, slotLength, autoConfirm, blockedDates } */
export function updateMySchedule({ schedule, slotLength, autoConfirm, blockedDates }) {
  return request((db) => {
    const { d } = myDoctor(db);
    const errs = validateSchedule(schedule);
    if (Object.keys(errs).length) throw new ApiError(Object.values(errs)[0], 422, errs);
    if (!SLOT_LENGTHS.includes(Number(slotLength))) throw new ApiError(tx('Choose a valid appointment length.'), 422);
    d.schedule = schedule;
    d.slotLength = Number(slotLength);
    d.autoConfirm = !!autoConfirm;
    d.blockedDates = [...(blockedDates || [])].filter((b) => b.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date));
    // Existing bookings are kept; patients on blocked dates are told so the doctor can follow up.
    const clashes = db.appointments.filter((a) => a.doctorId === d.id && ['pending', 'confirmed'].includes(a.status) && d.blockedDates.some((b) => b.date === a.date));
    return { doctor: doctorView(db, d), clashes: clashes.length };
  });
}

/** Re-submit a rejected verification. */
export function resubmitVerification(changes = {}) {
  return request((db) => {
    const { user, d } = myDoctor(db);
    if (d.verification.status !== 'rejected') throw new ApiError(tx('Only rejected applications can be re-submitted.'), 409);
    if (changes.licenseNumber) {
      if (!/^\d{4,6}$/.test(changes.licenseNumber)) throw new ApiError(tx('Enter your Order of Physicians number (4–6 digits).'), 422, { licenseNumber: tx('Enter 4–6 digits.') });
      d.licenseNumber = changes.licenseNumber;
    }
    d.verification = { ...d.verification, status: 'pending', resubmitted: true, submittedAt: new Date().toISOString(), note: changes.note || '' };
    db.users.filter((u) => u.role === 'admin').forEach((a) => notify(db, a.id, {
      title: 'Verification resubmitted',
      body: '{0} re-submitted their application.',
      link: '/admin/verifications',
      kind: 'warning',

      vars: {
        0: user.name
      }
    }));
    logActivity(db, '{0} re-submitted their verification', 'verification', {
      0: user.name
    });
    return doctorView(db, d);
  });
}

export function getMyPatients() {
  return request((db) => {
    const { d } = myDoctor(db);
    const appts = db.appointments.filter((a) => a.doctorId === d.id);
    const ids = [...new Set(appts.map((a) => a.patientId))];
    return ids.map((pid) => {
      const u = db.users.find((x) => x.id === pid);
      const mine = appts.filter((a) => a.patientId === pid).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      const past = mine.filter((a) => a.date <= todayISO() && a.status === 'completed');
      const upcoming = mine.filter((a) => ['pending', 'confirmed'].includes(a.status) && a.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return {
        id: u.id, name: u.name, email: u.email, phone: u.phone, gender: u.gender, status: u.status,
        dob: u.patient?.dob, bloodType: u.patient?.bloodType, allergies: u.patient?.allergies || [],
        insurance: u.patient?.insuranceId ? tx(nameOf(db.catalog.insurers, u.patient.insuranceId)) : null,
        visits: past.length, lastVisit: past[0]?.date || null, nextVisit: upcoming[0] ? { date: upcoming[0].date, time: upcoming[0].time } : null,
        totalAppointments: mine.length,
      };
    }).sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''));
  });
}

export function getPatientRecord(patientId) {
  return request((db) => {
    const { d } = myDoctor(db);
    const appts = db.appointments.filter((a) => a.doctorId === d.id && a.patientId === patientId);
    if (!appts.length) throw new ApiError(tx('This patient has no appointments with you.'), 403);
    const u = db.users.find((x) => x.id === patientId);
    return {
      patient: {
        id: u.id, name: u.name, email: u.email, phone: u.phone, gender: u.gender, dob: u.patient?.dob,
        bloodType: u.patient?.bloodType, allergies: u.patient?.allergies || [],
        insurance: u.patient?.insuranceId ? tx(nameOf(db.catalog.insurers, u.patient.insuranceId)) : null,
        insuranceNumber: u.patient?.insuranceNumber,
      },
      appointments: appts.map((a) => appointmentView(db, a)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
      prescriptions: db.prescriptions.filter((p) => p.doctorId === d.id && p.patientId === patientId).map((p) => prescriptionView(db, p)).sort((a, b) => b.date.localeCompare(a.date)),
    };
  });
}

export function listPublicClinics() {
  return request((db) => db.clinics.map((c) => ({ ...c, doctors: db.doctors.filter((d) => d.clinicId === c.id && visible(db, d)).length })), { latency: 100 });
}

