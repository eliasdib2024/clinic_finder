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
