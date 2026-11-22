import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { HttpError } from '../errors/http-error.js';
import { config } from '../config/env.js';

const tooMany = (message) => (req, res, next) => next(new HttpError(429, message));
const common = { standardHeaders: 'draft-8', legacyHeaders: false, skip: () => config.isTest };

// Sign-in protection – only FAILED attempts are counted (a correct password never uses up the allowance).
//
// 1. Per account: 10 failures in 15 minutes for one email from one network → that email is paused there.
//    Other accounts on the same network (same Wi-Fi, same clinic) can still sign in.
// 2. Per network: 50 failures in 15 minutes from one IP, whatever the emails → stops someone trying
//    one password against many accounts.
const loginEmail = (req) => String(req.body?.email ?? '').trim().toLowerCase();

const loginAccountLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${ipKeyGenerator(req.ip)}:${loginEmail(req)}`,
  handler: tooMany('Too many failed sign-in attempts for this account. Please wait 15 minutes and try again.'),
});

const loginNetworkLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 50,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login-network:${ipKeyGenerator(req.ip)}`,
  handler: tooMany('Too many failed sign-in attempts from this network. Please wait 15 minutes and try again.'),
});

// Used as one middleware in the route: both checks run, in this order
export const loginLimiter = [loginNetworkLimiter, loginAccountLimiter];

// Stops mass account creation: 10 NEW accounts per hour per IP (a form with mistakes is not counted)
export const signupLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  skipFailedRequests: true,
  handler: tooMany('Too many accounts were created from this network. Please try again later.'),
});

// ---- forgot password ----
// Requests for a reset code: 10 per 15 minutes per IP …
export const forgotPasswordIpLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: tooMany('Too many reset requests from this network. Please wait 15 minutes and try again.'),
});

// … and 5 per hour per email address, whoever asks (stops someone flooding another person's inbox).
// Runs after validation, so req.body.email is already trimmed and lower-cased.
export const forgotPasswordEmailLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => `forgot:${req.body.email}`,
  handler: tooMany('Too many reset codes were requested for this email. Please try again in an hour.'),
});

// Code checks: 20 wrong codes per 15 minutes per IP, on top of the 5 attempts each code allows
export const verifyResetCodeLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many incorrect codes from this network. Please wait 15 minutes and try again.'),
});

// Setting the new password: 10 tries per 15 minutes per IP
export const resetPasswordLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many attempts. Please wait 15 minutes and try again.'),
});

// ---- email verification (signed in, so limits are per account) ----
// Code checks: 20 wrong codes per 15 minutes per account, on top of the 5 attempts each code allows
export const verifyEmailLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `verify-email:${req.user.id}`,
  handler: tooMany('Too many incorrect codes. Please wait 15 minutes and try again.'),
});

// New codes: 5 SENT codes per hour per account (stops inbox flooding), on top of the 60-second gap.
// Refused requests (still in the 60 s gap, already verified) are not counted, so a user who presses
// "Resend" too early does not use up the hour's allowance.
export const resendVerificationLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  skipFailedRequests: true,
  keyGenerator: (req) => `resend-verification:${req.user.id}`,
  handler: tooMany('Too many codes were requested. Please try again in an hour.'),
});

// Settings → change password: 10 wrong current passwords per 15 minutes per account
export const changePasswordLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `change-password:${req.user.id}`,
  handler: tooMany('Too many attempts. Please wait 15 minutes and try again.'),
});
