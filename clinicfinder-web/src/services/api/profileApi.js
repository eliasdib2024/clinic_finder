// Profile endpoints of clinicfinder-api: Settings → Profile / Health / Danger zone, and the practice profile.
// Each function sends the form to the API (the database is the source of truth), then refreshes the
// browser copy through the bridge so the pages that still read it show the new values.
import { http, setApiToken } from '../http';
import { mirrorUser, closeMockSession } from './bridge';
import { translated } from './authApi';
import {
  genderIdFor, cityIdFor, bloodTypeIdFor, insuranceIdFor, clinicIdFor, languageIdsFor, insuranceIdsFor,
} from './lookups';

// "education.1.year" → "education": the practice form shows one message for the whole list
const collapseListErrors = (err) => {
  if (err.fields) {
    for (const key of Object.keys(err.fields)) {
      const [head] = key.split('.');
      if (head === 'education' && key !== head) { err.fields.education ??= err.fields[key]; delete err.fields[key]; }
    }
  }
  return err;
};

async function send(request) {
  try { return await mirrorUser(await request()); } catch (err) { throw collapseListErrors(translated(err)); }
}

/** Settings → Profile (every role): name, email, phone, gender. A new email must be confirmed again. */
export async function updateProfile(v) {
  const body = {};
  if ('name' in v) body.name = String(v.name).trim();
  if ('email' in v) body.email = String(v.email).trim();
  if ('phone' in v) body.phone = v.phone;
  if ('gender' in v) body.genderId = await genderIdFor(v.gender);
  return send(() => http.patch('/users/me', body, { fieldMap: { genderId: 'gender' } }));
}

/** Settings → Health (patients): any part of the health profile. */
export async function updateHealth(v) {
  const body = {};
  if ('dob' in v && v.dob) body.dob = v.dob;
  if ('city' in v && v.city) body.cityId = await cityIdFor(v.governorate, v.city);
  if ('bloodType' in v) body.bloodTypeId = await bloodTypeIdFor(v.bloodType);
  if ('insuranceId' in v) {
    body.insuranceId = await insuranceIdFor(v.insuranceId);
    body.insuranceNumber = body.insuranceId ? String(v.insuranceNumber || '').trim() : null;
  }
  if ('emergencyContact' in v) body.emergencyContact = String(v.emergencyContact || '').trim() || null;
  if ('allergies' in v) body.allergies = v.allergies;
  if ('noKnownAllergies' in v) body.noKnownAllergies = !!v.noKnownAllergies;
  return send(() => http.patch('/patients/me/health-profile', body, { fieldMap: { cityId: 'city', bloodTypeId: 'bloodType' } }));
}

/** Settings → Danger zone. The account is deactivated in the database, then the user is signed out. */
export async function deactivateAccount(confirmEmail) {
  try {
    await http.post('/users/me/deactivate', { confirmEmail: String(confirmEmail).trim() }, { fieldMap: { confirmEmail: 'confirm' } });
  } catch (err) { throw translated(err); }
  setApiToken(null);
  await closeMockSession();
  return { ok: true };
}

// ---- doctors ----

/** Loads the practice profile from the database into the browser copy. */
export const refreshMyDoctorProfile = () => send(() => http.get('/doctors/me'));

/** Practice profile: fee, bio, experience, video visits, clinic or own practice, languages, insurances, education. */
export async function updateDoctorProfile(p) {
  const body = {};
  if ('bio' in p) body.bio = String(p.bio || '').trim() || null;
  if ('fee' in p) body.fee = Number(p.fee);
  if ('experience' in p) body.experience = Number(p.experience);
  if ('videoConsult' in p) body.videoConsult = !!p.videoConsult;
  if ('clinicId' in p) body.clinicId = p.clinicId ? await clinicIdFor(p.clinicId) : null;
  if (!p.clinicId && p.practice) {
    body.practice = {
      name: String(p.practice.name || '').trim(),
      address: String(p.practice.address || '').trim(),
      phone: String(p.practice.phone || '').trim() || null,
    };
    if (p.city) body.cityId = await cityIdFor(p.governorate, p.city);
  }
  if ('languages' in p) body.languageIds = await languageIdsFor(p.languages);
  if ('insurances' in p) body.insuranceIds = await insuranceIdsFor(p.insurances);
  if ('education' in p) {
    body.education = (p.education || [])
      .filter((e) => e.degree || e.institution || e.year)
      .map((e) => ({ degree: String(e.degree || '').trim(), institution: String(e.institution || '').trim(), year: Number(e.year) }));
  }
  return send(() => http.patch('/doctors/me', body, {
    fieldMap: { languageIds: 'languages', insuranceIds: 'insurances', cityId: 'city' },
  }));
}

/** Sends a rejected application again, optionally with a corrected license number. */
export async function resubmitVerification({ licenseNumber, note } = {}) {
  const body = {};
  if (licenseNumber) body.licenseNumber = String(licenseNumber).trim();
  if (note && note.trim()) body.note = note.trim();
  return send(() => http.post('/doctors/me/verification', body));
}
