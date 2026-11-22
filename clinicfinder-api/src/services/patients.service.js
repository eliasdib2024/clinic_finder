// patients.service.js – patient sign-up and health profile. Knows nothing about HTTP.
import { conflict, notFound, validationFailed } from '../errors/http-error.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as patientsRepository from '../repositories/patients.repository.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import * as activity from '../repositories/activity.repository.js';
import { hashPassword } from '../utils/password.js';
import { toUserDto } from '../utils/serializers.js';
import { sessionFor } from './auth.service.js';
import { sendFirstCode } from './email-verification.service.js';

// Step 1 of patient sign-up: create the account and sign the patient in
export async function register({ name, email, phone, password }) {
  if (await usersRepository.existsByEmail(email)) {
    throw conflict('An account with this email already exists.', [{ field: 'email', message: 'An account with this email already exists.' }]);
  }

  const user = await patientsRepository.createWithUser({
    fullName: name, email, phone, passwordHash: await hashPassword(password),
  });

  await Promise.all([
    activity.logActivity('{0} joined as a patient', 'signup', { 0: user.fullName }),
    activity.notify(user.id, {
      title: 'Welcome to ClinicFinder', body: 'Find a doctor near you and book in a few clicks.',
      link: '/patient/search', kind: 'success',
    }),
    sendFirstCode(user),   // email the code that confirms the address
  ]);
  return sessionFor(user);
}

export async function getMe(userId) {
  return toUserDto(await usersRepository.findById(userId));
}

// The ids sent by the form must exist in the lookup tables
async function checkReferences(data) {
  const errors = [];
  if (data.cityId !== undefined && !(await lookupsRepository.cityExists(data.cityId))) {
    errors.push({ field: 'cityId', message: 'Choose a city from the list.' });
  }
  if (data.bloodTypeId && !(await lookupsRepository.bloodTypeExists(data.bloodTypeId))) {
    errors.push({ field: 'bloodTypeId', message: 'Choose a valid blood type.' });
  }
  if (data.insuranceId && !(await lookupsRepository.insuranceExists(data.insuranceId))) {
    errors.push({ field: 'insuranceId', message: 'Choose an insurer from the list.' });
  }
  if (errors.length) throw validationFailed(errors);
}

function toColumns(data) {
  const columns = {};
  if (data.dob !== undefined) columns.dob = new Date(`${data.dob}T00:00:00Z`);
  if (data.cityId !== undefined) columns.cityId = data.cityId;
  if (data.bloodTypeId !== undefined) columns.bloodId = data.bloodTypeId;
  if (data.insuranceId !== undefined) {
    columns.insuranceId = data.insuranceId;
    if (data.insuranceId === null) columns.insuranceNumber = null;   // self-pay: no policy number
  }
  if (data.insuranceNumber !== undefined && data.insuranceId !== null) columns.insuranceNumber = data.insuranceNumber;
  if (data.emergencyContact !== undefined) columns.emergencyContact = data.emergencyContact;
  if (data.noKnownAllergies !== undefined) columns.noKnownAllergies = data.noKnownAllergies;
  // Listing an allergy always overrides an earlier "no known allergies"
  if (data.allergies?.length) columns.noKnownAllergies = false;
  return columns;
}

async function save(userId, data, extra = {}) {
  const patient = await patientsRepository.findByUserId(userId);
  if (!patient) throw notFound('Patient profile');
  await checkReferences(data);
  await patientsRepository.saveHealthProfile(patient.id, { ...toColumns(data), ...extra }, data.allergies);
  return patient;
}

// Step 2 of patient sign-up (PUT): the full health profile. Unlocks the app.
export async function saveHealthProfile(userId, data) {
  const before = await save(userId, data, { onboarding: 'done' });
  const user = await usersRepository.findById(userId);
  if (before.onboarding === 'pending') {
    await activity.logActivity('{0} completed their health profile', 'user', { 0: user.fullName });
  }
  return toUserDto(user);
}

// Later changes from Settings (PATCH)
export async function updateHealthProfile(userId, changes) {
  const patient = await patientsRepository.findByUserId(userId);
  if (!patient) throw notFound('Patient profile');
  // Cross-field rule with what is already stored: an insurer needs a policy number
  const insuranceId = changes.insuranceId !== undefined ? changes.insuranceId : patient.insuranceId;
  const insuranceNumber = changes.insuranceNumber !== undefined ? changes.insuranceNumber : patient.insuranceNumber;
  if (insuranceId && !insuranceNumber) {
    throw validationFailed([{ field: 'insuranceNumber', message: 'Enter your policy or membership number.' }]);
  }
  await save(userId, changes);
  return toUserDto(await usersRepository.findById(userId));
}
