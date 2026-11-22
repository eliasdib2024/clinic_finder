// password-reset.service.js – "forgot password" in 3 steps. Knows nothing about HTTP.
//
//   1. requestReset(email)          email a 6-digit code (always the same answer, see below)
//   2. verifyCode(email, code)      check the code → a short-lived reset token
//   3. resetPassword(token, pass)   set the new password, sign out every session, send a notice
//
// Protections:
//   • Account enumeration: step 1 answers identically for known, unknown, suspended or rate-limited emails,
//     and emails are sent in the background so the timing is the same too. Step 2 uses one message
//     for "wrong", "expired", "used up" and "no such account".
//   • Guessing: 5 attempts per code, 10-minute expiry, a new code replaces the old one,
//     plus per-IP and per-email rate limits on the routes.
//   • Storage: only an HMAC of the code is saved; the new password is hashed with bcrypt + pepper.
//   • One-time use: the reset token is bound to the code, and the final update only succeeds if
//     that code is still the verified one. Afterwards every existing sign-in token stops working.
import { HttpError, validationFailed } from '../errors/http-error.js';
import { config } from '../config/env.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as activity from '../repositories/activity.repository.js';
import * as mail from './mail.service.js';
import { generateCode, hashCode, codeMatches, fingerprint } from '../utils/one-time-code.js';
import { signResetToken, verifyResetToken } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { logger } from '../loggers/logger.js';

const log = logger.child({ module: 'password-reset' });
const rules = config.passwordReset;
const minutes = (n) => n * 60 * 1000;

const INVALID_CODE = 'This code is incorrect or has expired. Check the latest email, or request a new code.';
const SESSION_EXPIRED = 'Your reset session has expired. Please request a new code.';

export const REQUEST_ACCEPTED = {
  message: 'If an account exists for this email, we have sent a 6-digit code to it. It expires in 10 minutes.',
  expiresInMinutes: rules.codeTtlMinutes,
  resendAfterSeconds: rules.resendCooldownSeconds,
};

// ───────────────────────────── step 1
export async function requestReset(email) {
  const user = await usersRepository.findForPasswordResetByEmail(email);

  if (!user || user.status !== 'active') {
    // Unknown, suspended or deactivated: nothing is sent, but the caller gets the same answer.
    log.info({ reason: user ? `account ${user.status}` : 'unknown email' }, 'reset requested, no code sent');
    return REQUEST_ACCEPTED;
  }

  // Resend cooldown: a code issued less than 60 s ago is kept (stops inbox flooding)
  if (user.resetCodeExpiry) {
    const issuedAt = user.resetCodeExpiry.getTime() - minutes(rules.codeTtlMinutes);
    if (Date.now() - issuedAt < rules.resendCooldownSeconds * 1000) {
      log.info({ userId: user.id }, 'reset requested again within cooldown, previous code kept');
      return REQUEST_ACCEPTED;
    }
  }

  const code = generateCode();
  await usersRepository.saveResetCode(user.id, hashCode(code), new Date(Date.now() + minutes(rules.codeTtlMinutes)));
  mail.sendPasswordResetCode(user, code);
  log.info({ userId: user.id }, 'reset code issued');
  return REQUEST_ACCEPTED;
}

// ───────────────────────────── step 2
export async function verifyCode(email, code) {
  const user = await usersRepository.findForPasswordResetByEmail(email);
  const invalid = () => validationFailed([{ field: 'code', message: INVALID_CODE }]);

  if (!user || user.status !== 'active' || !user.resetCode) throw invalid();
  if (user.resetCodeExpiry < new Date() || user.resetCodeAttempts >= rules.maxAttempts) throw invalid();

  const attempts = await usersRepository.countResetAttempt(user.id);   // counted before comparing
  if (attempts > rules.maxAttempts || !codeMatches(code, user.resetCode)) {
    log.warn({ userId: user.id, attempts }, 'wrong reset code');
    throw invalid();
  }

  await usersRepository.markResetCodeVerified(user.id);
  log.info({ userId: user.id }, 'reset code verified');
  return { resetToken: signResetToken(user), expiresInMinutes: rules.sessionTtlMinutes };
}

// ───────────────────────────── step 3
export async function resetPassword(resetToken, newPassword) {
  let payload;
  try {
    payload = verifyResetToken(resetToken);
  } catch {
    throw new HttpError(400, SESSION_EXPIRED);
  }
  if (payload.purpose !== 'password-reset') throw new HttpError(400, SESSION_EXPIRED);

  const user = await usersRepository.findForPasswordResetById(Number(payload.sub));
  const stillValid = user && user.status === 'active' && user.resetCode && user.resetCodeVerified
    && fingerprint(user.resetCode) === payload.rcv;
  if (!stillValid) throw new HttpError(400, SESSION_EXPIRED);

  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw validationFailed([{ field: 'password', message: 'Choose a password different from your current one.' }]);
  }

  const done = await usersRepository.completePasswordReset(
    user.id, user.resetCode, await hashPassword(newPassword), user.emailVerified ? null : new Date(),
  );
  if (!done) throw new HttpError(400, SESSION_EXPIRED);   // used a moment ago by another request

  await Promise.all([
    activity.logActivity('{0} reset their password', 'user', { 0: user.fullName }),
    activity.notify(user.id, {
      title: 'Password changed',
      body: `Your password was reset. If this was not you, contact ${config.supportEmail}.`,
      kind: 'warning',
    }),
  ]);
  mail.sendPasswordChanged(user);
  log.info({ userId: user.id }, 'password reset completed, all sessions signed out');
  return { message: 'Your password has been changed. Sign in with your new password.' };
}
