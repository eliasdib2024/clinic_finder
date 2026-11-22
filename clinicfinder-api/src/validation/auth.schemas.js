import { z } from 'zod';
import { email, newPassword } from './common.schemas.js';

export const loginBody = z.object({
  email,
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(128),
  remember: z.boolean().default(false),
}).strict();

// ---- forgot password ----
// Note: these error messages appear under the form fields in the frontend.

// POST /auth/forgot-password
export const forgotPasswordBody = z.object({ email }).strict();

// POST /auth/verify-reset-code
export const verifyResetCodeBody = z.object({
  email,
  code: z.string({ error: 'Enter the 6-digit code.' }).trim().regex(/^\d{6}$/, 'Enter all 6 digits.'),
}).strict();

// POST /auth/reset-password
export const resetPasswordBody = z.object({
  resetToken: z.string({ error: 'Your reset session has expired. Please request a new code.' }).min(20).max(2000),
  password: newPassword,
}).strict();
