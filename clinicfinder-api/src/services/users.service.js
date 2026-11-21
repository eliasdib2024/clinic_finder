// users.service.js – accounts: the user's own settings, and administration. Knows nothing about HTTP.
import { conflict, forbidden, notFound } from '../errors/http-error.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as activity from '../repositories/activity.repository.js';
import { toUserDto, page } from '../utils/serializers.js';

export async function list(filters, paging) {
  const { items, total } = await usersRepository.list(filters, paging);
  return page(items.map(toUserDto), total, paging);
}

export async function getById(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw notFound(`User ${id}`);
  return toUserDto(user);
}

export async function updateMe(userId, { name, phone, language, notifications }) {
  const data = {};
  if (name !== undefined) data.fullName = name;
  if (phone !== undefined) data.phone = phone;
  if (language !== undefined) data.language = language;
  if (notifications) {
    const map = { email: 'notifyEmail', sms: 'notifySms', reminders: 'notifyReminders', newBooking: 'notifyNewBooking', marketing: 'notifyMarketing' };
    for (const [key, value] of Object.entries(notifications)) data[map[key]] = value;
  }
  return toUserDto(await usersRepository.update(userId, data));
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
