// Bridge between the real API and the pages that still run on the browser mock.
//
// Sign-up, sign-in and the health profile now go to clinicfinder-api. The other pages (search, booking,
// prescriptions, admin…) still read the local mock store until they are migrated module by module.
// So after every successful API sign-in, the signed-in user is copied into the mock store and a mock
// session is opened. When a module moves to the API, it simply stops reading the mock.
import { request, newId, setToken, getToken } from '../db';
import { publicUser } from '../serializers';
import { defaultSchedule } from '../../lib/schedule';
import { appSpecialtyId, appInsurerId, appGovernorateId } from './lookups';

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

/** Copy an API user into the mock store, open a mock session, and return the user in the app's shape. */
export function mirrorUser(apiUser, { remember = true } = {}) {
  return request((db) => {
    const email = apiUser.email.toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      user = { id: newId('u'), createdAt: apiUser.createdAt, passwordHash: '', gender: '' };
      db.users.push(user);
    }
    Object.assign(user, {
      apiId: apiUser.id,
      role: apiUser.role,
      name: apiUser.name,
      email,
      phone: apiUser.phone,
      status: apiUser.status,
      settings: { ...(user.settings || {}), language: apiUser.language, notifications: { ...apiUser.notifications } },
    });
    if (apiUser.role === 'patient') user.patient = patientFrom(apiUser.patient);

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
        verification: {
          status: d.verification.status, reason: d.verification.reason || '', resubmitted: false,
          submittedAt: d.verification.submittedAt, reviewedAt: d.verification.reviewedAt,
        },
      });
    }

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
