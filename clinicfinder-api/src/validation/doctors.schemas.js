import { z } from 'zod';
import { email, fullName, phone, newPassword, id, pagination } from './common.schemas.js';

// POST /doctors – create a doctor account (application waits for an administrator)
export const registerDoctorBody = z.object({
  name: fullName,
  email,
  phone,
  password: newPassword,
  specialtyId: id,
  licenseNumber: z.string({ error: 'License number is required.' }).trim()
    .regex(/^\d{4,6}$/, 'Enter your Order of Physicians number (4–6 digits).'),
  cityId: id,
  acceptTerms: z.literal(true, { error: 'Please accept the terms to continue.' }),
}).strict();

// GET /doctors?verification=pending – admin list
export const listDoctorsQuery = z.object({
  verification: z.enum(['pending', 'approved', 'rejected']).optional(),
  ...pagination,
});

// PATCH /doctors/:id/verification – admin approves or rejects
export const verificationBody = z.object({
  status: z.enum(['approved', 'rejected'], { error: 'Status must be approved or rejected.' }),
  reason: z.string().trim().max(500).optional(),
}).strict().refine((d) => d.status !== 'rejected' || (d.reason && d.reason.length >= 5), {
  path: ['reason'], message: 'Explain why the application is rejected (at least 5 characters).',
});
