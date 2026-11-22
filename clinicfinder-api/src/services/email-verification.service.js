// email-verification.service.js – confirm that a user owns their email address. Knows nothing about HTTP.
//
//   sendFirstCode(user)     right after sign-up: email a 6-digit code (never makes sign-up fail)
//   resendCode(userId)      the signed-in user asks for a new code
//   verifyCode(userId, c)   the signed-in user types the code → the address is verified
//
// The user is signed in for every step (sign-up returns a token), so unlike "forgot password"
// the answers can be explicit: nobody learns anything about accounts that are not theirs.
//
// Protections (same design as the password reset code):
//   • Only an HMAC of the code is stored (purpose "email-verification", so a reset code never works here).
//   • 15-minute expiry, 5 attempts per code, a new code replaces the old one, 60 s between two codes,
//     plus per-IP and per-account rate limits on the routes.
//   • One-time use: the final update only succeeds while that code is still the current one.
// A completed password reset also verifies the address (see password-reset.service.js).
import { HttpError, conflict, notFound, validationFailed } from '../errors/http-error.js';
import { config } from '../config/env.js';
import * as usersRepository from '../repositories/users.repository.js';
import * as activity from '../repositories/activity.repository.js';
import * as mail from './mail.service.js';
import { generateCode, hashCode, codeMatches, PURPOSE } from '../utils/one-time-code.js';
import { toUserDto } from '../utils/serializers.js';
import { logger } from '../loggers/logger.js';

const log = logger.child({ module: 'email-verification' });
const rules = config.emailVerification;
const minutes = (n) => n * 60 * 1000;

const EXPIRED = 'This code has expired. Request a new code.';
const WRONG = 'This code is incorrect.';
const TOO_MANY = 'Too many incorrect codes. Request a new code.';

const codeSent = () => ({
  message: 'We sent a 6-digit code to your email address.',
  expiresInMinutes: rules.codeTtlMinutes,
  resendAfterSeconds: rules.resendCooldownSeconds,
});

// Creates a code, stores its HMAC and emails it (in the background)
async function issueCode(user) {
  const code = generateCode();
  await usersRepository.saveVerificationCode(
    user.id, hashCode(code, PURPOSE.emailVerification), new Date(Date.now() + minutes(rules.codeTtlMinutes)),
  );
  mail.sendEmailVerificationCode(user, code);
  log.info({ userId: user.id }, 'verification code issued');
}

// ───────────────────────────── after sign-up
// The account already exists at this point: a failure here is logged, and the user can press "resend".
// After the user changes their email in Settings: a code goes to the NEW address at once
// (no 60-second wait – it is a different address). Same rules as the first code.
export async function sendCodeToNewEmail(user) {
  await issueCode(user);
}

export async function sendFirstCode(user) {
  try {
    await issueCode(user);
  } catch (err) {
    log.error({ userId: user.id, err: { message: err.message } }, 'could not issue the first verification code');
  }
}

// ───────────────────────────── resend
export async function resendCode(userId) {
  const user = await usersRepository.findForEmailVerification(userId);
  if (!user) throw notFound('User');
  if (user.emailVerified) throw conflict('Your email address is already confirmed.');

  if (user.emailVerificationExpiry) {
    const issuedAt = user.emailVerificationExpiry.getTime() - minutes(rules.codeTtlMinutes);
    const waitSeconds = Math.ceil((issuedAt + rules.resendCooldownSeconds * 1000 - Date.now()) / 1000);
    if (waitSeconds > 0) throw new HttpError(429, `Please wait ${waitSeconds} seconds before asking for a new code.`);
  }

  await issueCode(user);
  return codeSent();
}

// ───────────────────────────── verify
export async function verifyCode(userId, code) {
  const user = await usersRepository.findForEmailVerification(userId);
  if (!user) throw notFound('User');
  const fail = (message) => validationFailed([{ field: 'code', message }]);

  // Already verified (double click, second tab…): answer success, nothing to do
  if (user.emailVerified) {
    return { message: 'Your email address is confirmed.', user: toUserDto(await usersRepository.findById(userId)) };
  }

  if (!user.emailVerificationCode || user.emailVerificationExpiry < new Date()) throw fail(EXPIRED);
  if (user.emailVerificationAttempts >= rules.maxAttempts) throw fail(TOO_MANY);

  const attempts = await usersRepository.countVerificationAttempt(user.id);   // counted before comparing
  if (!codeMatches(code, user.emailVerificationCode, PURPOSE.emailVerification)) {
    log.warn({ userId: user.id, attempts }, 'wrong verification code');
    throw fail(attempts >= rules.maxAttempts ? TOO_MANY : WRONG);
  }
  if (attempts > rules.maxAttempts) throw fail(TOO_MANY);   // a parallel request used the last attempt

  const done = await usersRepository.completeEmailVerification(user.id, user.emailVerificationCode);
  if (!done) throw fail(EXPIRED);   // replaced by a new code a moment ago

  await activity.notify(user.id, {
    title: 'Email confirmed', body: 'Your email address is confirmed. Thank you!', kind: 'success',
  });
  log.info({ userId: user.id }, 'email verified');
  return { message: 'Your email address is confirmed.', user: toUserDto(await usersRepository.findById(userId)) };
}
