// Account endpoints of clinicfinder-api. Each function returns the user in the app's shape.
import { http, setApiToken, getApiToken } from '../http';
import { ApiError } from '../db';
import { tx } from '../../lib/i18n';
import { mirrorUser, closeMockSession } from './bridge';
import { specialtyIdFor, cityIdFor, bloodTypeIdFor, insuranceIdFor } from './lookups';

const translated = (err) => {
  if (err instanceof ApiError) {
    err.message = tx(err.message);
    if (err.fields) for (const k of Object.keys(err.fields)) err.fields[k] = tx(err.fields[k]);
  }
  return err;
};

async function startSession({ token, user }, remember) {
  setApiToken(token, remember);
  const appUser = await mirrorUser(user, { remember });
  return { token, user: appUser };
}

export async function login({ email, password, remember = false }) {
  try {
    const session = await http.post('/auth/login', { email: String(email).trim(), password, remember: !!remember });
    return await startSession(session, remember);
  } catch (err) { throw translated(err); }
}

export async function signup(data) {
  try {
    const base = {
      name: String(data.name).trim(),
      email: String(data.email).trim(),
      phone: data.phone,
      password: data.password,
      acceptTerms: !!data.acceptTerms,
    };
    let session;
    if (data.role === 'doctor') {
      const [specialtyId, cityId] = await Promise.all([specialtyIdFor(data.specialtyId), cityIdFor(data.governorate, data.city)]);
      session = await http.post('/doctors', { ...base, specialtyId, licenseNumber: String(data.licenseNumber).trim(), cityId },
        { fieldMap: { cityId: 'city' } });
    } else {
      session = await http.post('/patients', base);
    }
    return await startSession(session, true);
  } catch (err) { throw translated(err); }
}

/** The signed-in user, or null when there is no (valid) token. */
export async function me() {
  if (!getApiToken()) { await closeMockSession(); return null; }
  try {
    return await mirrorUser(await http.get('/auth/me'));
  } catch (err) {
    if (err.status === 401 || err.status === 403) {   // expired token or suspended account
      setApiToken(null);
      await closeMockSession();
      return null;
    }
    throw translated(err);
  }
}

export async function logout() {
  setApiToken(null);          // the token is simply forgotten (it expires on its own)
  await closeMockSession();
  return true;
}

/** Step 2 of patient sign-up. */
export async function completeOnboarding(v) {
  try {
    const [cityId, bloodTypeId, insuranceId] = await Promise.all([
      cityIdFor(v.governorate, v.city), bloodTypeIdFor(v.bloodType), insuranceIdFor(v.insuranceId),
    ]);
    const user = await http.put('/patients/me/health-profile', {
      dob: v.dob,
      cityId,
      bloodTypeId,
      insuranceId,
      insuranceNumber: insuranceId ? String(v.insuranceNumber || '').trim() : null,
      allergies: v.allergies,
      noKnownAllergies: !!v.noKnownAllergies,
    }, { fieldMap: { cityId: 'city', bloodTypeId: 'bloodType' } });
    return await mirrorUser(user);
  } catch (err) { throw translated(err); }
}
