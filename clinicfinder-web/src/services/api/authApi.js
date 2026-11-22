// Account endpoints of clinicfinder-api. Each function returns the user in the app's shape.
import { http, setApiToken, getApiToken } from '../http';
import { ApiError } from '../db';
import { tx } from '../../lib/i18n';
import { mirrorUser, closeMockSession } from './bridge';
import { specialtyIdFor, cityIdFor, bloodTypeIdFor, insuranceIdFor } from './lookups';
import { SUPPORT_EMAIL } from '../../lib/constants';

// API messages contain the support address; the translations hold {0} in its place
const txApi = (msg) => (typeof msg === 'string' && msg.includes(SUPPORT_EMAIL)
  ? tx(msg.split(SUPPORT_EMAIL).join('{0}'), { 0: SUPPORT_EMAIL })
  : tx(msg));

const translated = (err) => {
  if (err instanceof ApiError) {
    err.message = txApi(err.message);
    if (err.fields) for (const k of Object.keys(err.fields)) err.fields[k] = txApi(err.fields[k]);
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

// ---- Email verification (signed in: the code is emailed at sign-up) ----

/** Confirms the address with the emailed code. Returns the updated user (emailVerified: true). */
export async function verifyEmail(code) {
  try {
    const res = await http.post('/auth/verify-email', { code: String(code) });
    return await mirrorUser(res.user);
  } catch (err) { throw translated(err); }
}

/** Emails a new code. Resolves with { resendAfterSeconds, expiresInMinutes }. */
export async function resendVerification() {
  try {
    const res = await http.post('/auth/resend-verification', {});
    return { resendAfterSeconds: res.resendAfterSeconds, expiresInMinutes: res.expiresInMinutes };
  } catch (err) { throw translated(err); }
}

// ---- Forgot password (public, no sign-in token needed) ----

/** Step 1. Always resolves with the same answer, whether or not the email has an account. */
export async function forgotPassword(email) {
  try {
    const res = await http.post('/auth/forgot-password', { email: String(email).trim() });
    return { sent: true, resendAfterSeconds: res.resendAfterSeconds, expiresInMinutes: res.expiresInMinutes };
  } catch (err) { throw translated(err); }
}

/** Step 2. Returns the short-lived reset token that step 3 needs. */
export async function verifyResetCode(email, code) {
  try {
    const res = await http.post('/auth/verify-reset-code', { email: String(email).trim(), code: String(code) });
    return { verified: true, resetToken: res.resetToken };
  } catch (err) { throw translated(err); }
}

/** Step 3. The server signs out every session of this account; the user signs in again. */
export async function resetPassword(resetToken, password) {
  try {
    await http.post('/auth/reset-password', { resetToken, password }, { fieldMap: { password: 'pw' } });
    setApiToken(null);            // a token stored in this browser is no longer valid either
    await closeMockSession();
    return { ok: true };
  } catch (err) { throw translated(err); }
}
