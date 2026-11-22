// auth.service.js – signing in. Knows nothing about HTTP.
import { HttpError, unauthorized, notFound } from '../errors/http-error.js';
import { config } from '../config/env.js';
import * as usersRepository from '../repositories/users.repository.js';
import { verifyPassword, fakeVerify } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import { toUserDto } from '../utils/serializers.js';

const WRONG = 'Incorrect email or password.';

export async function login({ email, password, remember }) {
  const user = await usersRepository.findByEmailWithPassword(email);

  // Same message (and same time) whether the email or the password is wrong
  const ok = user ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
  if (!ok) throw unauthorized(WRONG);

  if (user.status === 'suspended') throw new HttpError(403, `This account is suspended. Please contact ${config.supportEmail}.`);
  if (user.status === 'deactivated') throw new HttpError(403, `This account was deactivated. Contact ${config.supportEmail} to restore it.`);

  return { token: signAccessToken(user, { remember }), user: toUserDto(user) };
}

// Builds the { token, user } answer right after an account is created
export const sessionFor = (user) => ({ token: signAccessToken(user, { remember: true }), user: toUserDto(user) });

export async function me(userId) {
  const user = await usersRepository.findById(userId);
  if (!user) throw notFound('User');
  return toUserDto(user);
}
