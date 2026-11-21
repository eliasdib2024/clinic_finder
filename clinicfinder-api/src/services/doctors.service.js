// doctors.service.js – doctor sign-up and verification by an administrator. Knows nothing about HTTP.
import { conflict, notFound, validationFailed } from '../errors/http-error.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as doctorsRepository from '../repositories/doctors.repository.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import * as activity from '../repositories/activity.repository.js';
import { hashPassword } from '../utils/password.js';
import { toDoctorApplicationDto, page } from '../utils/serializers.js';
import { sessionFor } from './auth.service.js';

const DEFAULT_FEE = 50; // USD – the doctor changes it in the practice profile

// Doctor sign-up: the account works at once, but the profile is hidden from patients until approved
export async function register({ name, email, phone, password, specialtyId, licenseNumber, cityId }) {
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
    { fullName, email, phone, passwordHash: await hashPassword(password) },
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
