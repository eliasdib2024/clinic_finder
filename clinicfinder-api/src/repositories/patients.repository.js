// patients.repository.js – patients and their allergies
import { prisma } from '../config/prisma.js';
import { USER_PROFILE_INCLUDE } from './includes.js';

// Creates the user row and the patient row in ONE statement (both or neither)
export const createWithUser = (user) =>
  prisma.user.create({
    data: { ...user, role: 'patient', patient: { create: { onboarding: 'pending' } } },
    include: USER_PROFILE_INCLUDE,
  });

export const findByUserId = (userId) =>
  prisma.patient.findUnique({ where: { userId }, include: { allergies: true } });

// Updates the patient row and (when given) replaces the allergy list, in one transaction
export async function saveHealthProfile(patientId, data, allergies) {
  await prisma.$transaction(async (tx) => {
    await tx.patient.update({ where: { id: patientId }, data });
    if (allergies) {
      await tx.patientAllergy.deleteMany({ where: { patientId } });
      if (allergies.length) {
        await tx.patientAllergy.createMany({ data: allergies.map((name) => ({ patientId, name })) });
      }
    }
  });
}
