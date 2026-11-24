// Bridge between the real API and the pages that still run on the browser mock.
//
// Sign-up, sign-in and the health profile now go to clinicfinder-api. The other pages (search, booking,
// prescriptions, admin…) still read the local mock store until they are migrated module by module.
// So after every successful API sign-in, the signed-in user is copied into the mock store and a mock
// session is opened. When a module moves to the API, it simply stops reading the mock.
import { request, newId, setToken, getToken } from '../db';
import { publicUser } from '../serializers';
import { defaultSchedule } from '../../lib/schedule';
import { appSpecialtyId, appInsurerId, appGovernorateId, appGender, appClinicId, appLanguageId } from './lookups';

function patientFrom(p) {
  return {
    bloodType: p?.bloodType?.name ?? '',
    allergies: p?.allergies ?? [],
    noKnownAllergies: !!p?.noKnownAllergies,
    insuranceId: appInsurerId(p?.insurance?.name),
    insuranceNumber: p?.insuranceNumber ?? '',
    dob: p?.dob ?? '',
    governorate: appGovernorateId(p?.governorate?.name),
    city: p?.city?.name ?? '',
    emergencyContact: p?.emergencyContact ?? '',
    onboarding: p?.onboarding ?? 'pending',
  };
}

/**
 * Finds (or creates) the browser copy of an API user and refreshes it. Does NOT open a session.
 *
 * Matching: by API id AND creation time (the same id can belong to another person after the database
 * was recreated – ids start again at 1), then by email. A user who is not a doctor never keeps a doctor
 * profile in the browser copy, so they can never appear in the doctors' verification list.
 */
function upsertMockUser(db, apiUser) {
  const email = apiUser.email.toLowerCase();
  const samePerson = (u) => u.apiId === apiUser.id
    && (u.apiCreatedAt ? u.apiCreatedAt === apiUser.createdAt : u.email.toLowerCase() === email);   // older copies: by email
  let user = db.users.find(samePerson) || db.users.find((u) => u.email.toLowerCase() === email);
  // A copy that belongs to another person (same id, different account) is retired
  for (const stale of db.users.filter((u) => u !== user && u.apiId === apiUser.id)) delete stale.apiId;
  if (!user) {
    user = { id: newId('u'), createdAt: apiUser.createdAt, passwordHash: '', gender: '' };
    db.users.push(user);
  }
  Object.assign(user, {
    apiId: apiUser.id,
    apiCreatedAt: apiUser.createdAt,
    role: apiUser.role,
    name: apiUser.name,
    email,
    phone: apiUser.phone,
    gender: appGender(apiUser.gender),
    status: apiUser.status,
    emailVerified: apiUser.emailVerified,   // false → the guards send the user to /verify-email
    settings: { ...(user.settings || {}), language: apiUser.language, notifications: { ...apiUser.notifications } },
  });
  if (apiUser.role === 'patient') user.patient = patientFrom(apiUser.patient);

  if (apiUser.role !== 'doctor') db.doctors = db.doctors.filter((d) => d.userId !== user.id);
  if (apiUser.role === 'doctor' && apiUser.doctor) {
    const d = apiUser.doctor;
    let doctor = db.doctors.find((x) => x.userId === user.id);
    if (!doctor) {
      doctor = {
        id: newId('d'), userId: user.id, clinicId: null, fee: d.fee ?? 50, languages: ['ar', 'en'], insurances: [],
        experience: 0, education: [], bio: '', rating: 0, reviewsCount: 0, schedule: defaultSchedule(),
        slotLength: 30, autoConfirm: false, videoConsult: true, blockedDates: [],
        practice: { name: d.practiceName || `${apiUser.name} Clinic`, address: d.practiceAddress || '', phone: '' },
        createdAt: apiUser.createdAt,
      };
      db.doctors.push(doctor);
    }
    Object.assign(doctor, {
      apiId: d.id,
      specialtyId: appSpecialtyId(d.specialty?.name) || doctor.specialtyId,
      licenseNumber: d.licenseNumber,
      governorate: appGovernorateId(d.governorate?.name),
      city: d.city?.name ?? '',
      // Practice profile – the database is the source of truth
      clinicId: appClinicId(d.clinic?.name),
      practice: { name: d.practiceName || '', address: d.practiceAddress || '', phone: d.practicePhone || '' },
      fee: d.fee,
      experience: d.experience ?? 0,
      bio: d.bio || '',
      videoConsult: !!d.videoConsult,
      languages: (d.languages || []).map((l) => appLanguageId(l.name)).filter(Boolean),
      insurances: (d.insurances || []).map((i) => appInsurerId(i.name)).filter(Boolean),
      education: (d.education || []).map(({ degree, institution, year }) => ({ degree, institution, year })),
      verification: {
        status: d.verification.status, reason: d.verification.reason || '', resubmitted: !!d.verification.resubmitted,
        note: d.verification.note || '', submittedAt: d.verification.submittedAt, reviewedAt: d.verification.reviewedAt,
      },
    });
  }

  return user;
}

/** Copy an API user into the mock store, open a mock session, and return the user in the app's shape. */
export function mirrorUser(apiUser, { remember = true } = {}) {
  return request((db) => {
    const user = upsertMockUser(db, apiUser);
    // Reuse this tab's mock session if it already points to this user
    const current = getToken();
    if (!(current && db.sessions[current]?.userId === user.id)) {
      const token = newId('tok');
      db.sessions[token] = { userId: user.id, createdAt: new Date().toISOString(), remember };
      setToken(token, remember);
    }
    return publicUser(user);
  }, { latency: 0 });
}

export function closeMockSession() {
  return request((db) => {
    const t = getToken();
    if (t) delete db.sessions[t];
    setToken(null);
    return true;
  }, { latency: 0 });
}

/**
 * Admin: copy doctor applications from the API (GET /doctors) into the browser copy, without touching
 * the admin's own session. Returns the browser ids of those doctors, in the API's order.
 */
export function mirrorDoctorApplications(applications) {
  return request((db) => applications.map((app) => {
    const user = upsertMockUser(db, {
      id: app.user.id, role: 'doctor', name: app.user.name, email: app.user.email, phone: app.user.phone,
      status: app.user.status, emailVerified: app.user.emailVerified, createdAt: app.user.createdAt,
      language: 'en', notifications: {}, doctor: app,
    });
    return db.doctors.find((d) => d.userId === user.id).id;
  }), { latency: 0 });
}
