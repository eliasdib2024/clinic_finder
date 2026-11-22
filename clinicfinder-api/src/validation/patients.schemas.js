import { z } from 'zod';
import { email, fullName, phone, newPassword, id, isoDate } from './common.schemas.js';

const acceptTerms = z.literal(true, { error: 'Please accept the terms to continue.' });

// POST /patients – create a patient account (step 1 of sign-up)
export const registerPatientBody = z.object({
  name: fullName,
  email,
  phone,
  password: newPassword,
  acceptTerms,
}).strict();

const today = () => new Date().toISOString().slice(0, 10);

const allergy = z.string().trim().min(1).max(100);
const healthFields = {
  dob: isoDate
    .refine((v) => v <= today(), 'Date of birth cannot be in the future.')
    .refine((v) => v >= '1900-01-01', 'Enter a valid date of birth.'),
  cityId: id,
  bloodTypeId: id.nullable(),
  insuranceId: id.nullable(),
  insuranceNumber: z.string().trim().max(50).nullable(),
  emergencyContact: phone.nullable(),
  allergies: z.array(allergy).max(30, 'At most 30 allergies.')
    .transform((list) => list.filter((a, i) => list.findIndex((b) => b.toLowerCase() === a.toLowerCase()) === i)), // drop duplicates
  noKnownAllergies: z.boolean(),
};

// Rules that involve several fields
function crossCheck(data, ctx) {
  if (data.insuranceId && data.insuranceNumber !== undefined && !data.insuranceNumber) {
    ctx.addIssue({ code: 'custom', path: ['insuranceNumber'], message: 'Enter your policy or membership number.' });
  }
  if (data.allergies !== undefined && data.noKnownAllergies !== undefined && !data.allergies.length && !data.noKnownAllergies) {
    ctx.addIssue({ code: 'custom', path: ['allergies'], message: 'Add your allergies, or confirm you have none.' });
  }
}

// PUT /patients/me/health-profile – the full health profile (step 2 of sign-up). Completes onboarding.
export const healthProfileBody = z.object({
  ...healthFields,
  bloodTypeId: healthFields.bloodTypeId.default(null),
  insuranceId: healthFields.insuranceId.default(null),
  insuranceNumber: healthFields.insuranceNumber.default(null),
  emergencyContact: healthFields.emergencyContact.default(null),
}).strict().superRefine(crossCheck);

// PATCH /patients/me/health-profile – change any subset later (from Settings)
export const healthProfilePatchBody = z.object(healthFields).partial().strict()
  .refine((d) => Object.keys(d).length > 0, 'Send at least one field.')
  .superRefine(crossCheck);
