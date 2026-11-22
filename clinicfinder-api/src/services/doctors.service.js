// doctors.service.js – doctor sign-up and verification by an administrator. Knows nothing about HTTP.
import { conflict, notFound, validationFailed } from '../errors/http-error.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as doctorsRepository from '../repositories/doctors.repository.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import * as activity from '../repositories/activity.repository.js';
import { hashPassword } from '../utils/password.js';
import { toDoctorApplicationDto, toUserDto, page } from '../utils/serializers.js';
import { sessionFor } from './auth.service.js';
import { sendFirstCode } from './email-verification.service.js';

const DEFAULT_FEE = 50; // USD – the doctor changes it in the practice profile

// Doctor sign-up: the account works at once, but the profile is hidden from patients until approved
export async function register({ name, email, phone, password, language, specialtyId, licenseNumber, cityId }) {
  const errors = [];
  const [emailTaken, licenseTaken, specialtyOk, cityOk] = await Promise.all([
    usersRepository.existsByEmail(email),
    doctorsRepository.existsByLicense(licenseNumber),
    lookupsRepository.specialtyExists(specialtyId),
    lookupsRepository.cityExists(cityId),
  ]);
  if (!specialtyOk) errors.push({ field: 'specialtyId', message: 'Choose a specialty from the list.' });
  if (!cityOk) errors.push({ field: 'cityId', message: 'Choose a city from the list.' });
  if (errors.length) throw validationFailed(errors);
  if (emailTaken) errors.push({ field: 'email', message: 'An account with this email already exists.' });
  if (licenseTaken) errors.push({ field: 'licenseNumber', message: 'This license number is already registered.' });
  if (errors.length) throw conflict(errors[0].message, errors);

  const fullName = /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
  const user = await doctorsRepository.createWithUser(
    { fullName, email, phone, language, passwordHash: await hashPassword(password) },
    {
      license: licenseNumber, specialtyId, cityId,
      practiceName: `${fullName} Clinic`, practiceAddress: '', fee: DEFAULT_FEE,
      verificationStatus: 'pending',
    },
  );

  await Promise.all([
    activity.logActivity('{0} signed up as a doctor', 'signup', { 0: fullName }),
    activity.notifyAdmins({
      title: 'New doctor application', body: '{0} applied for verification.', vars: { 0: fullName }, link: '/admin/verifications',
    }),
    activity.notify(user.id, {
      title: 'Welcome to ClinicFinder', body: 'Your profile is under review. Complete your practice profile while you wait.',
      link: '/doctor/profile', kind: 'success',
    }),
    sendFirstCode(user),   // email the code that confirms the address
  ]);
  return sessionFor(user);
}

export async function list(filters, paging) {
  const { items, total } = await doctorsRepository.list(filters, paging);
  return page(items.map(toDoctorApplicationDto), total, paging);
}

export async function getById(id) {
  const doctor = await doctorsRepository.findById(id);
  if (!doctor) throw notFound(`Doctor ${id}`);
  return toDoctorApplicationDto(doctor);
}

// Admin decision on an application
export async function review(adminId, id, { status, reason }) {
  const doctor = await doctorsRepository.findById(id);
  if (!doctor) throw notFound(`Doctor ${id}`);
  if (doctor.verificationStatus === status) throw conflict(`This application is already ${status}.`);
  // Patients will contact and book this doctor: the address must be real before the profile goes public
  if (status === 'approved' && !doctor.user.emailVerified) {
    throw conflict('This doctor has not confirmed their email address yet. They need to enter the code we emailed them first.');
  }

  const updated = await doctorsRepository.update(id, {
    verificationStatus: status,
    verificationReason: status === 'rejected' ? reason : null,
    verificationReviewedAt: new Date(),
    reviewedById: adminId,
  });

  const approved = status === 'approved';
  await Promise.all([
    activity.logActivity(approved ? '{0} was verified' : '{0} was rejected', 'verification', { 0: doctor.user.fullName }),
    activity.notify(doctor.user.id, approved
      ? { title: 'Profile approved', body: 'Patients can now find and book you.', link: '/doctor', kind: 'success' }
      : { title: 'Application needs changes', body: '{0}', vars: { 0: reason }, link: '/doctor/profile', kind: 'warning' }),
  ]);
  return toDoctorApplicationDto(updated);
}

// ---------------------------------------------------------------- the doctor's own profile

async function myDoctor(userId) {
  const doctor = await doctorsRepository.findByUserId(userId);
  if (!doctor) throw notFound('Doctor profile');
  return doctor;
}

export async function getMe(userId) {
  await myDoctor(userId);
  return toUserDto(await usersRepository.findById(userId));
}

// Practice profile (PATCH /doctors/me)
export async function updateMe(userId, changes) {
  const doctor = await myDoctor(userId);

  // Every id sent by the form must exist
  const errors = [];
  const clinic = changes.clinicId ? await lookupsRepository.findClinic(changes.clinicId) : null;
  if (changes.clinicId && !clinic) errors.push({ field: 'clinicId', message: 'Select a listed clinic.' });
  if (changes.cityId !== undefined && !changes.clinicId && !(await lookupsRepository.cityExists(changes.cityId))) {
    errors.push({ field: 'cityId', message: 'Choose a city from the list.' });
  }
  if (changes.languageIds && !(await lookupsRepository.languagesExist(changes.languageIds))) {
    errors.push({ field: 'languageIds', message: 'Choose languages from the list.' });
  }
  if (changes.insuranceIds && !(await lookupsRepository.insurancesExist(changes.insuranceIds))) {
    errors.push({ field: 'insuranceIds', message: 'Choose insurers from the list.' });
  }
  if (errors.length) throw validationFailed(errors);

  const data = {};
  for (const key of ['bio', 'fee', 'experience', 'videoConsult']) if (changes[key] !== undefined) data[key] = changes[key];
  if (changes.clinicId !== undefined) data.clinicId = changes.clinicId;
  if (clinic) {
    data.cityId = clinic.cityId;                 // a listed clinic decides the location
  } else if (changes.cityId !== undefined && (changes.clinicId === null || !doctor.clinicId)) {
    data.cityId = changes.cityId;                // own practice: the doctor chooses the city
  }
  if (changes.practice) {
    data.practiceName = changes.practice.name;
    data.practiceAddress = changes.practice.address;
    if (changes.practice.phone !== undefined) data.practicePhone = changes.practice.phone;
  }

  await doctorsRepository.updateProfile(doctor.id, data, {
    languageIds: changes.languageIds, insuranceIds: changes.insuranceIds, education: changes.education,
  });
  return toUserDto(await usersRepository.findById(userId));
}

// A rejected doctor sends the application again (POST /doctors/me/verification)
export async function resubmit(userId, { licenseNumber, note }) {
  const doctor = await myDoctor(userId);
  if (doctor.verificationStatus !== 'rejected') throw conflict('Only rejected applications can be re-submitted.');
  if (licenseNumber && await doctorsRepository.existsByLicense(licenseNumber, doctor.id)) {
    throw conflict('This license number is already registered.', [{ field: 'licenseNumber', message: 'This license number is already registered.' }]);
  }

  await doctorsRepository.updateProfile(doctor.id, {
    ...(licenseNumber && { license: licenseNumber }),
    verificationStatus: 'pending',
    verificationResubmitted: true,
    verificationNote: note || null,
    verificationSubmittedAt: new Date(),
    verificationReviewedAt: null,
    reviewedById: null,
  });

  const user = await usersRepository.findById(userId);
  await Promise.all([
    activity.logActivity('{0} re-submitted their verification', 'verification', { 0: user.fullName }),
    activity.notifyAdmins({
      title: 'Verification resubmitted', body: '{0} re-submitted their application.', vars: { 0: user.fullName },
      link: '/admin/verifications', kind: 'warning',
    }),
  ]);
  return toUserDto(user);
}
