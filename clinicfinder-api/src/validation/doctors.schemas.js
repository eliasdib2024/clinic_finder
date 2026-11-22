import { z } from 'zod';
import { email, fullName, phone, newPassword, id, pagination, language } from './common.schemas.js';

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
  language: language.default('en'),
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

// ---- the doctor's own practice profile ----

const currentYear = () => new Date().getFullYear();
const uniqueIds = (label) => z.array(id).max(20, `At most 20 ${label}.`)
  .refine((ids) => new Set(ids).size === ids.length, `Each ${label.slice(0, -1)} can be chosen once.`);

const educationItem = z.object({
  degree: z.string({ error: 'Degree is required.' }).trim().min(2, 'Enter the degree.').max(100),
  institution: z.string({ error: 'Institution is required.' }).trim().min(2, 'Enter the institution.').max(150),
  year: z.coerce.number({ error: 'Enter the year.' }).int('Enter a whole year.')
    .min(1950, 'Enter a year after 1950.').refine((y) => y <= currentYear(), 'The year cannot be in the future.'),
}).strict();

// PATCH /doctors/me – practice profile. Send only what changed, or the whole form.
// clinicId = a listed clinic (location comes from the clinic) | null = own practice (practice + cityId needed).
export const updateMyProfileBody = z.object({
  bio: z.string().trim().max(1200, 'Keep your biography under 1,200 characters.').nullable(),
  fee: z.coerce.number({ error: 'Enter a consultation fee.' }).min(0, 'Fee must be between $0 and $1,000.').max(1000, 'Fee must be between $0 and $1,000.'),
  experience: z.coerce.number({ error: 'Enter years of experience.' }).int('Enter whole years.')
    .min(0, 'Enter years of experience between 0 and 60.').max(60, 'Enter years of experience between 0 and 60.'),
  videoConsult: z.boolean(),
  clinicId: id.nullable(),
  practice: z.object({
    name: z.string({ error: 'Practice name is required.' }).trim().min(2, 'Practice name is required.').max(150),
    address: z.string({ error: 'Practice address is required.' }).trim().min(3, 'Practice address is required.').max(255),
    phone: phone.nullable().optional(),
  }).strict(),
  cityId: id,
  languageIds: uniqueIds('languages').min(1, 'Select at least one language.'),
  insuranceIds: uniqueIds('insurances'),
  education: z.array(educationItem).max(10, 'At most 10 degrees.'),
}).partial().strict()
  .refine((d) => Object.keys(d).length > 0, 'Send at least one field.')
  .superRefine((d, ctx) => {
    if (d.clinicId === null) {   // switching to (or saving) an own practice
      if (!d.practice) ctx.addIssue({ code: 'custom', path: ['practice'], message: 'Enter your practice name and address.' });
      if (d.cityId === undefined) ctx.addIssue({ code: 'custom', path: ['cityId'], message: 'Choose a city.' });
    }
  });

// POST /doctors/me/verification – send a rejected application again (optionally with a corrected license)
export const resubmitBody = z.object({
  licenseNumber: z.string().trim().regex(/^\d{4,6}$/, 'Enter your Order of Physicians number (4–6 digits).').optional(),
  note: z.string().trim().max(500, 'Keep the note under 500 characters.').optional(),
}).strict();
