// jwt.js – sign and verify the tokens the API hands out.
//
// Access token  "Authorization: Bearer <token>" on every request.
//   Carries `pwv`, a fingerprint of the user's current password hash. When the password changes,
//   the fingerprint no longer matches and every token issued before is rejected: changing or
//   resetting a password signs the account out everywhere.
//
// Reset token   returned once the emailed code is verified; it can only set a new password.
//   Signed with a different key (derived from JWT_SECRET), so it can never be used as an access token
//   and an access token can never be used to reset a password. It carries a fingerprint of the
//   reset code, so it stops working as soon as the password is changed or a new code is requested.
import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { fingerprint } from './one-time-code.js';

const ISSUER = 'clinicfinder-api';
const resetKey = createHmac('sha256', config.jwt.secret).update('password-reset-token').digest();

export const passwordVersion = (passwordHash) => fingerprint(passwordHash);

// `rem` remembers whether the user ticked "keep me signed in", so a replacement token
// (after changing the password) keeps the same lifetime.
export function signAccessToken(user, { remember = false } = {}) {
  return jwt.sign({ role: user.role, pwv: passwordVersion(user.passwordHash), rem: remember || undefined }, config.jwt.secret, {
    subject: String(user.id),
    issuer: ISSUER,
    expiresIn: remember ? config.jwt.rememberExpiresIn : config.jwt.expiresIn,
  });
}

// Throws if the token is invalid or expired
export const verifyAccessToken = (token) =>
  jwt.verify(token, config.jwt.secret, { issuer: ISSUER, algorithms: ['HS256'] });

export function signResetToken(user) {
  return jwt.sign({ purpose: 'password-reset', rcv: fingerprint(user.resetCode) }, resetKey, {
    subject: String(user.id),
    issuer: ISSUER,
    expiresIn: `${config.passwordReset.sessionTtlMinutes}m`,
  });
}

export const verifyResetToken = (token) =>
  jwt.verify(token, resetKey, { issuer: ISSUER, algorithms: ['HS256'] });
