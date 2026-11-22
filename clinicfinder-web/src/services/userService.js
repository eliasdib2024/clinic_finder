import { tx } from '../lib/i18n';
// The signed-in user's own account: profile, health details, settings, notifications.
import { ApiError, request, requireUser, setToken, logActivity } from './db';
import { isApiConfigured } from './http';
import * as api from './api/authApi';
import { publicUser } from './serializers';
import { email as vEmail, lebanesePhone, normalizeLebanesePhone, required } from '../lib/validators';
import { BLOOD_TYPES, GOVERNORATES, citiesOf } from '../lib/constants';

export function updateProfile(patch) {
  return request((db) => {
    const user = requireUser(db);
    const errors = {};
    if ('name' in patch && (required(patch.name, 'Name') || patch.name.trim().length < 3)) errors.name = tx('Enter your full name.');
    if ('email' in patch) {
      const e = vEmail(patch.email);
      if (e) errors.email = e;
      else if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === patch.email.trim().toLowerCase())) errors.email = tx('This email is already used by another account.');
    }
    if ('phone' in patch && lebanesePhone(patch.phone)) errors.phone = lebanesePhone(patch.phone);
    if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);
    if ('name' in patch) user.name = user.role === 'doctor' && !/^dr\.?\s/i.test(patch.name.trim()) ? `Dr. ${patch.name.trim()}` : patch.name.trim();
    if ('email' in patch) user.email = patch.email.trim().toLowerCase();
    if ('phone' in patch) user.phone = normalizeLebanesePhone(patch.phone);
    if ('gender' in patch) user.gender = patch.gender;
    return publicUser(user);
  });
}

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Validates a patient's health profile. With `complete` (the onboarding step) the core
 * fields become required: date of birth, governorate, city, and an explicit allergy answer.
 */
function healthErrors(db, patch, { complete = false } = {}) {
  const e = {};
  if (patch.bloodType && !BLOOD_TYPES.includes(patch.bloodType)) e.bloodType = tx('Choose a valid blood type.');
  if (patch.insuranceId && !db.catalog.insurers.some((i) => i.id === patch.insuranceId)) e.insuranceId = tx('Choose an insurer from the list.');
  if (patch.insuranceId && !String(patch.insuranceNumber || '').trim()) e.insuranceNumber = tx('Enter your policy or membership number.');
  if (patch.dob && patch.dob > todayISO()) e.dob = tx('Date of birth cannot be in the future.');
  if (patch.dob && patch.dob < '1900-01-01') e.dob = tx('Enter a valid date of birth.');
  if (patch.governorate && !GOVERNORATES.some((g) => g.id === patch.governorate)) e.governorate = tx('Choose a governorate.');
  if (patch.city && !citiesOf(patch.governorate).includes(patch.city)) e.city = tx('Choose a city in the selected governorate.');
  if (patch.emergencyContact && lebanesePhone(patch.emergencyContact)) e.emergencyContact = lebanesePhone(patch.emergencyContact);
  if (complete) {
    if (!patch.dob) e.dob = e.dob || tx('Enter your date of birth.');
    if (!patch.governorate) e.governorate = tx('Choose a governorate.');
    if (!patch.city) e.city = e.city || tx('Choose a city.');
    if (!(patch.allergies || []).length && !patch.noKnownAllergies) e.allergies = tx('Add your allergies, or confirm you have none.');
  }
  return e;
}

function applyHealth(user, patch) {
  const allergies = (patch.allergies ?? user.patient.allergies ?? []).map((a) => a.trim()).filter(Boolean);
  user.patient = {
    ...user.patient,
    ...patch,
    allergies,
    // Listing an allergy always overrides an earlier "no known allergies".
    noKnownAllergies: allergies.length ? false : !!(patch.noKnownAllergies ?? user.patient.noKnownAllergies),
  };
  if (!user.patient.insuranceId) user.patient.insuranceNumber = '';
  if (!user.patient.governorate) user.patient.city = '';
}

export function updateHealth(patch) {
  return request((db) => {
    const user = requireUser(db, ['patient']);
    const merged = { ...user.patient, ...patch };
    const errors = healthErrors(db, merged);
    if (Object.keys(errors).length) throw new ApiError(Object.values(errors)[0], 422, errors);
    applyHealth(user, patch);
    return publicUser(user);
  });
}

/** Second step of patient sign-up: saves the health profile and unlocks the app. */
export function completeOnboarding(patch) {
  if (isApiConfigured()) return api.completeOnboarding(patch);
  return request((db) => {
    const user = requireUser(db, ['patient']);
    const errors = healthErrors(db, patch, { complete: true });
    if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);
    applyHealth(user, patch);
    user.patient.onboarding = 'done';
    logActivity(db, '{0} completed their health profile', 'user', { 0: user.name });
    return publicUser(user);
  });
}

export function updateSettings(patch) {
  return request((db) => {
    const user = requireUser(db);
    user.settings = { ...user.settings, ...patch, notifications: { ...user.settings.notifications, ...(patch.notifications || {}) } };
    return publicUser(user);
  }, { latency: 150 });
}

/** Deactivate own account: cancels future bookings and signs out everywhere. */
export function deactivateAccount(confirmEmail) {
  return request((db) => {
    const user = requireUser(db, ['patient', 'doctor']);
    if (String(confirmEmail).trim().toLowerCase() !== user.email) throw new ApiError(tx('Type your email address exactly to confirm.'), 422, { confirm: tx('Email does not match.') });
    user.status = 'deactivated';
    cancelFutureFor(db, user, 'Account deactivated');
    for (const [t, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[t];
    setToken(null);
    logActivity(db, '{0} deactivated their account', 'user', {
      0: user.name
    });
    return { ok: true };
  });
}

export function cancelFutureFor(db, user, note) {
  const today = new Date().toISOString().slice(0, 10);
  const doctor = user.role === 'doctor' ? db.doctors.find((d) => d.userId === user.id) : null;
  let count = 0;
  for (const a of db.appointments) {
    const mine = a.patientId === user.id || (doctor && a.doctorId === doctor.id);
    if (mine && ['pending', 'confirmed'].includes(a.status) && a.date >= today) {
      a.status = 'cancelled'; a.statusNote = note; a.updatedAt = new Date().toISOString();
      a.history.push({ status: 'cancelled', at: a.updatedAt, by: 'system', note });
      count++;
    }
  }
  return count;
}

// ---- notifications ----
export function listNotifications() {
  return request((db) => {
    const user = requireUser(db);
    return db.notifications.filter((n) => n.userId === user.id).slice(0, 40);
  }, { latency: 120 });
}

export function markNotificationRead(id) {
  return request((db) => {
    const user = requireUser(db);
    const n = db.notifications.find((x) => x.id === id && x.userId === user.id);
    if (n) n.read = true;
    return true;
  }, { latency: 60 });
}

export function markAllNotificationsRead() {
  return request((db) => {
    const user = requireUser(db);
    db.notifications.forEach((n) => { if (n.userId === user.id) n.read = true; });
    return true;
  }, { latency: 80 });
}
