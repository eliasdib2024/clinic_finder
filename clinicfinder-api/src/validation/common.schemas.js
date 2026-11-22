import { z } from 'zod';
import { normalizeLebanesePhone } from '../utils/phone.js';

export const id = z.coerce.number({ error: 'Must be a number.' }).int().positive('Must be a valid id.');
export const idParams = z.object({ id });

export const email = z.string({ error: 'Email is required.' }).trim().toLowerCase()
  .pipe(z.email('Enter a valid email address.').max(255));

export const fullName = z.string({ error: 'Full name is required.' }).trim()
  .min(3, 'Enter your full name.').max(100, 'Name is too long.');

export const phone = z.string({ error: 'Phone number is required.' }).trim()
  .transform((v, ctx) => {
    const n = normalizeLebanesePhone(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid Lebanese number, e.g. 03 123 456 or +961 71 123 456.' });
    return n ?? z.NEVER;
  });

// Same 5 rules as the password strength meter in the frontend
export const newPassword = z.string({ error: 'Password is required.' })
  .min(8, 'At least 8 characters.')
  .max(128, 'At most 128 characters.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/\d/, 'Add a number.')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol.');

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Enter a valid date.');

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
