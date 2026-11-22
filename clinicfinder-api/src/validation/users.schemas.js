import { z } from 'zod';
import { fullName, phone, pagination, newPassword } from './common.schemas.js';

// PATCH /users/me/password – Settings → Password
export const changePasswordBody = z.object({
  currentPassword: z.string({ error: 'Enter your current password.' }).min(1, 'Enter your current password.').max(128),
  newPassword,
}).strict();

// GET /users – admin list with filters
export const listUsersQuery = z.object({
  role: z.enum(['patient', 'doctor', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'deactivated']).optional(),
  search: z.string().trim().max(100).optional(),
  ...pagination,
});

// PATCH /users/:id/status – admin suspends, reactivates or deactivates an account
export const updateStatusBody = z.object({
  status: z.enum(['active', 'suspended', 'deactivated']),
  reason: z.string().trim().max(300).optional(),
}).strict().refine((d) => d.status === 'active' || (d.reason && d.reason.length >= 5), {
  path: ['reason'], message: 'Give a reason (at least 5 characters).',
});

// PATCH /users/me – the signed-in user edits their own account
export const updateMeBody = z.object({
  name: fullName,
  phone,
  language: z.enum(['en', 'fr', 'ar']),
  notifications: z.object({
    email: z.boolean(), sms: z.boolean(), reminders: z.boolean(), newBooking: z.boolean(), marketing: z.boolean(),
  }).partial().strict(),
}).partial().strict().refine((d) => Object.keys(d).length > 0, 'Send at least one field.');
