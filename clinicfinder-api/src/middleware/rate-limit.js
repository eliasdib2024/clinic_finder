import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../errors/http-error.js';
import { config } from '../config/env.js';

const tooMany = (message) => (req, res, next) => next(new HttpError(429, message));
const common = { standardHeaders: 'draft-8', legacyHeaders: false, skip: () => config.isTest };

// Slows down password guessing: 10 FAILED sign-ins per 15 minutes per IP (successful ones are not counted)
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many failed sign-in attempts. Please wait 15 minutes and try again.'),
});

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
