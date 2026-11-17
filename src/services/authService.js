import { tx } from '../lib/i18n';
// Authentication — DEMO ONLY. Sessions, hashing and reset codes are simulated in the browser.
// With a real backend each function becomes an http call with the same signature, e.g.
//   export const login = (body) => http.post('/auth/login', body);   // → { token, user }
import { ApiError, request, setToken, getToken, currentUser, requireUser, hashPassword, newId, notify, logActivity } from './db';
import { publicUser } from './serializers';
import { email as vEmail, password as vPassword, lebanesePhone, normalizeLebanesePhone, licenseNumber, required, validate } from '../lib/validators';
import { defaultSchedule } from '../lib/schedule';
import { citiesOf } from '../lib/constants';

const findByEmail = (db, email) => db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());

export function login({ email, password, remember = false }) {
  return request((db) => {
    const errors = validate({ email, password }, { email: vEmail, password: (v) => required(v, 'Password') });
    if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);
    const user = findByEmail(db, email);
    if (!user || user.passwordHash !== hashPassword(password)) throw new ApiError(tx('Incorrect email or password.'), 401);
    if (user.status === 'suspended') throw new ApiError(tx('This account is suspended. Please contact support@clinicfinder.lb.'), 403);
    if (user.status === 'deactivated') throw new ApiError(tx(
      'This account was deactivated. Contact support@clinicfinder.lb to restore it.'
    ), 403);
    const token = newId('tok');
    db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString(), remember };
    setToken(token, remember);
    return { token, user: publicUser(user) };
  });
}

export function logout() {
  return request((db) => {
    const t = getToken();
    if (t) delete db.sessions[t];
    setToken(null);
    return true;
  }, { latency: 80 });
}

/** Current session user, or null. */
export function me() {
  return request((db) => {
    const user = currentUser(db);
    if (!user && getToken()) setToken(null);
    return user ? publicUser(user) : null;
  }, { latency: 60 });
}

/**
 * Sign up as patient or doctor.
 * Doctor fields: specialtyId, licenseNumber, governorate, city
 */
export function signup(data) {
  return request((db) => {
    const role = data.role === 'doctor' ? 'doctor' : 'patient';
    const schema = {
      name: (v) => required(v, 'Full name') || (String(v).trim().length < 3 ? 'Enter your full name.' : ''),
      email: vEmail,
      phone: (v) => lebanesePhone(v),
      password: vPassword,
    };
    if (role === 'doctor') {
      Object.assign(schema, {
        specialtyId: (v) => required(v, 'Specialty'),
        licenseNumber,
        governorate: (v) => required(v, 'Governorate'),
        city: (v, all) => required(v, 'City') || (citiesOf(all.governorate).includes(v) ? '' : 'Choose a city in the selected governorate.'),
      });
    }
    const errors = validate(data, schema);
    if (!data.acceptTerms) errors.acceptTerms = tx('Please accept the terms to continue.');
    if (findByEmail(db, data.email)) errors.email = tx('An account with this email already exists.');
    if (role === 'doctor' && db.doctors.some((d) => d.licenseNumber === String(data.licenseNumber).trim())) errors.licenseNumber = tx('This license number is already registered.');
    if (Object.keys(errors).length) throw new ApiError(tx('Please fix the highlighted fields.'), 422, errors);

    const userId = newId('u');
    const name = role === 'doctor' && !/^dr\.?\s/i.test(data.name.trim()) ? `Dr. ${data.name.trim()}` : data.name.trim();
    const user = {
      id: userId, role, name, email: data.email.trim().toLowerCase(), phone: normalizeLebanesePhone(data.phone),
      gender: data.gender || '', status: 'active', passwordHash: hashPassword(data.password), createdAt: new Date().toISOString(),
      settings: { language: 'en', notifications: { email: true, sms: true, reminders: true, newBooking: true, marketing: false } },
    };
    // New patients finish a short health profile (/welcome) before using the app.
    if (role === 'patient') user.patient = { bloodType: '', allergies: [], noKnownAllergies: false, insuranceId: '', insuranceNumber: '', dob: '', governorate: '', city: '', emergencyContact: '', onboarding: 'pending' };
    db.users.push(user);

    if (role === 'doctor') {
      db.doctors.push({
        id: newId('d'), userId, specialtyId: data.specialtyId, licenseNumber: String(data.licenseNumber).trim(),
        governorate: data.governorate, city: data.city, clinicId: null,
        practice: { name: `${name} Clinic`, address: '', phone: '' },
        fee: 50, languages: ['ar', 'en'], insurances: [], experience: 0, education: [], bio: '',
        rating: 0, reviewsCount: 0, schedule: defaultSchedule(), slotLength: 30, autoConfirm: false, videoConsult: true,
        blockedDates: [],
        verification: { status: 'pending', reason: '', resubmitted: false, submittedAt: new Date().toISOString(), reviewedAt: null },
        createdAt: new Date().toISOString(),
      });
      db.users.filter((u) => u.role === 'admin').forEach((a) => notify(db, a.id, {
        title: 'New doctor application',
        body: '{0} applied for verification.',
        link: '/admin/verifications',
        kind: 'info',

        vars: {
          0: name
        }
      }));
      logActivity(db, '{0} signed up as a doctor', 'signup', {
        0: name
      });
    } else {
      logActivity(db, '{0} joined as a patient', 'signup', {
        0: name
      });
    }
    notify(db, userId, { title: 'Welcome to ClinicFinder', body: role === 'doctor' ? 'Your profile is under review. Complete your practice profile while you wait.' : 'Find a doctor near you and book in a few clicks.', link: role === 'doctor' ? '/doctor/profile' : '/patient/search', kind: 'success' });

    const token = newId('tok');
    db.sessions[token] = { userId, createdAt: new Date().toISOString(), remember: true };
    setToken(token, true);
    return { token, user: publicUser(user) };
  });
}

const CODE_TTL = 10 * 60 * 1000;

/** Step 1 — request a 6-digit code. The demo returns it so the UI can show it in a toast (a real server emails it). */
export function forgotPassword(email) {
  return request((db) => {
    const err = vEmail(email);
    if (err) throw new ApiError(err, 422, { email: err });
    const user = findByEmail(db, email);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    // Always respond the same way to avoid revealing which emails exist.
    if (user) db.resetCodes[user.email] = { code, expires: Date.now() + CODE_TTL, verified: false, attempts: 0 };
    return { sent: true, demoCode: user ? code : null };
  });
}

/** Step 2 — verify the code. */
export function verifyResetCode(email, code) {
  return request((db) => {
    const entry = db.resetCodes[String(email).trim().toLowerCase()];
    if (!entry || entry.expires < Date.now()) throw new ApiError(tx('This code has expired. Request a new one.'), 410);
    entry.attempts += 1;
    if (entry.attempts > 5) throw new ApiError(tx('Too many attempts. Request a new code.'), 429);
    if (entry.code !== String(code)) throw new ApiError(tx('That code is not correct.'), 400, { code: tx('That code is not correct.') });
    entry.verified = true;
    return { verified: true };
  });
}

/** Step 3 — set a new password. */
export function resetPassword(email, code, newPassword) {
  return request((db) => {
    const key = String(email).trim().toLowerCase();
    const entry = db.resetCodes[key];
    if (!entry || !entry.verified || entry.code !== String(code) || entry.expires < Date.now()) throw new ApiError(tx('Your reset session expired. Start again.'), 410);
    const err = vPassword(newPassword);
    if (err) throw new ApiError(err, 422, { password: err });
    const user = findByEmail(db, key);
    user.passwordHash = hashPassword(newPassword);
    delete db.resetCodes[key];
    for (const [t, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[t];
    return { ok: true };
  });
}

export function changePassword(current, next) {
  return request((db) => {
    const user = requireUser(db);
    if (user.passwordHash !== hashPassword(current)) throw new ApiError(tx('Your current password is incorrect.'), 400, { current: tx('Your current password is incorrect.') });
    const err = vPassword(next);
    if (err) throw new ApiError(err, 422, { next: err });
    if (current === next) throw new ApiError(tx('Choose a password you have not used here before.'), 422, { next: tx('Choose a different password.') });
    user.passwordHash = hashPassword(next);
    return { ok: true };
  });
}
