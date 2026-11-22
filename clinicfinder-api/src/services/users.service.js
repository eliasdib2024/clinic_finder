// users.service.js – accounts: the user's own settings, and administration. Knows nothing about HTTP.
import { conflict, forbidden, notFound, validationFailed } from '../errors/http-error.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as activity from '../repositories/activity.repository.js';
import * as mail from './mail.service.js';
import { toUserDto, page } from '../utils/serializers.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import * as lookupsRepository from '../repositories/lookups.repository.js';
import { sendCodeToNewEmail } from './email-verification.service.js';
import { logger } from '../loggers/logger.js';

const log = logger.child({ module: 'users' });

// Settings → Password. The user is signed in, but must still prove they know the current password
// (someone using an unlocked computer cannot take over the account).
//   • The new password must differ from the current one: checked against the stored bcrypt hash.
//   • Saved as bcrypt(HMAC(password, pepper)) in users.user_password_hash.
//   • Every other session is signed out (their tokens carry the old password fingerprint);
//     this device receives a fresh token so the user stays signed in here.
export async function changePassword(userId, { currentPassword, newPassword }, { remember = false } = {}) {
  const user = await usersRepository.findForPasswordResetById(userId);
  if (!user) throw notFound('User');

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    log.warn({ userId }, 'change password: wrong current password');
    throw validationFailed([{ field: 'currentPassword', message: 'Your current password is incorrect.' }]);
  }
  if (newPassword === currentPassword || (await verifyPassword(newPassword, user.passwordHash))) {
    throw validationFailed([{ field: 'newPassword', message: 'Choose a password different from your current one.' }]);
  }

  const passwordHash = await hashPassword(newPassword);
  const done = await usersRepository.changePassword(user.id, user.passwordHash, passwordHash);
  if (!done) throw conflict('Your password was just changed from another session. Please sign in again.');

  await Promise.all([
    activity.logActivity('{0} changed their password', 'user', { 0: user.fullName }),
    activity.notify(user.id, {
      title: 'Password changed',
      body: 'Your password was changed from your account settings. Your other devices were signed out.',
      kind: 'info',
    }),
  ]);
  mail.sendPasswordChanged(user, { fromSettings: true });
  log.info({ userId }, 'password changed from settings, other sessions signed out');

  return {
    message: 'Your password has been changed. Your other devices were signed out.',
    token: signAccessToken({ ...user, passwordHash }, { remember }),
  };
}

export async function list(filters, paging) {
  const { items, total } = await usersRepository.list(filters, paging);
  return page(items.map(toUserDto), total, paging);
}

export async function getById(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw notFound(`User ${id}`);
  return toUserDto(user);
}

const withDoctorTitle = (name) => (/^dr\.?\s/i.test(name) ? name : `Dr. ${name}`);

// Settings → Profile / Preferences, for every role
export async function updateMe(userId, { name, email, phone, genderId, language, notifications }) {
  const current = await usersRepository.findById(userId);
  if (!current) throw notFound('User');

  const errors = [];
  const emailChanged = email !== undefined && email !== current.email;
  if (emailChanged && (await usersRepository.existsByEmail(email))) {
    throw conflict('This email is already used by another account.', [{ field: 'email', message: 'This email is already used by another account.' }]);
  }
  if (genderId && !(await lookupsRepository.genderExists(genderId))) errors.push({ field: 'genderId', message: 'Choose a valid option.' });
  if (errors.length) throw validationFailed(errors);

  const data = {};
  if (name !== undefined) data.fullName = current.role === 'doctor' ? withDoctorTitle(name) : name;
  if (emailChanged) Object.assign(data, { email, emailVerified: false, emailVerifiedAt: null });   // must be confirmed again
  if (phone !== undefined) data.phone = phone;
  if (genderId !== undefined) data.genderId = genderId;
  if (language !== undefined) data.language = language;
  if (notifications) {
    const map = { email: 'notifyEmail', sms: 'notifySms', reminders: 'notifyReminders', newBooking: 'notifyNewBooking', marketing: 'notifyMarketing' };
    for (const [key, value] of Object.entries(notifications)) data[map[key]] = value;
  }
  const updated = await usersRepository.update(userId, data);

  if (emailChanged) {
    await sendCodeToNewEmail(updated);
    await activity.logActivity('{0} changed their email address', 'user', { 0: updated.fullName });
    log.info({ userId }, 'email changed, verification code sent to the new address');
  }
  return toUserDto(updated);
}

// Settings → Danger zone. Signs the user out everywhere (the token check refuses inactive accounts).
// An administrator can restore the account from the admin panel.
export async function deactivateMe(userId, { confirmEmail }) {
  const user = await usersRepository.findById(userId);
  if (!user) throw notFound('User');
  if (user.role === 'admin') throw forbidden('Administrator accounts cannot be deactivated here.');
  if (confirmEmail !== user.email) throw validationFailed([{ field: 'confirmEmail', message: 'Email does not match.' }]);

  await usersRepository.update(userId, { status: 'deactivated', statusReason: 'Deactivated by the user' });
  await activity.logActivity('{0} deactivated their account', 'user', { 0: user.fullName });
}

async function findOther(adminId, id) {
  if (id === adminId) throw forbidden('You cannot change your own account here.');
  const user = await usersRepository.findById(id);
  if (!user) throw notFound(`User ${id}`);
  if (user.role === 'admin') throw forbidden('Administrator accounts cannot be changed here.');
  return user;
}

export async function updateStatus(adminId, id, { status, reason }) {
  const user = await findOther(adminId, id);
  if (user.status === status) throw conflict(`This account is already ${status}.`);
  const updated = await usersRepository.update(id, { status, statusReason: status === 'active' ? null : reason });
  const verbs = { active: 'reactivated', suspended: 'suspended', deactivated: 'deactivated' };
  await activity.logActivity(`{0} was ${verbs[status]} by an administrator`, 'user', { 0: user.fullName });
  return toUserDto(updated);
}

// Accounts with medical history (appointments, prescriptions) are protected by the database:
// deleting them fails with 409 – deactivate them instead.
export async function remove(adminId, id) {
  const user = await findOther(adminId, id);
  try {
    await usersRepository.remove(id);
  } catch (err) {
    if (err?.code === 'P2003') throw conflict('This account has appointments or prescriptions. Deactivate it instead of deleting it.');
    throw err;
  }
  await activity.logActivity('{0} was deleted by an administrator', 'user', { 0: user.fullName });
}
