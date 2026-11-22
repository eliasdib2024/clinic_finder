// doctors.repository.js – doctor profiles and their verification
import { prisma } from '../config/prisma.js';
import { USER_PROFILE_INCLUDE } from './includes.js';

const DOCTOR_WITH_USER = {
  specialty: true,
  city: { include: { governorate: true } },
  user: { select: { id: true, fullName: true, email: true, emailVerified: true, phone: true, status: true, createdAt: true } },
  reviewedBy: { select: { id: true, fullName: true } },
};

// Creates the user row and the doctor row in ONE statement (both or neither)
export const createWithUser = (user, doctor) =>
  prisma.user.create({
    data: { ...user, role: 'doctor', doctor: { create: doctor } },
    include: USER_PROFILE_INCLUDE,
  });

// exceptDoctorId: when a doctor re-submits, their own license does not count as "taken"
export const existsByLicense = async (license, exceptDoctorId) =>
  (await prisma.doctor.count({ where: { license, ...(exceptDoctorId && { id: { not: exceptDoctorId } }) } })) > 0;

export const findByUserId = (userId) =>
  prisma.doctor.findUnique({ where: { userId }, select: { id: true, clinicId: true, license: true, verificationStatus: true } });

// Updates the doctor row and replaces (when given) languages, insurances and education – all or nothing
export async function updateProfile(doctorId, data, { languageIds, insuranceIds, education } = {}) {
  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({ where: { id: doctorId }, data });
    if (languageIds) {
      await tx.doctorLanguage.deleteMany({ where: { doctorId } });
      await tx.doctorLanguage.createMany({ data: languageIds.map((languageId) => ({ doctorId, languageId })) });
    }
    if (insuranceIds) {
      await tx.doctorInsurance.deleteMany({ where: { doctorId } });
      if (insuranceIds.length) await tx.doctorInsurance.createMany({ data: insuranceIds.map((insuranceId) => ({ doctorId, insuranceId })) });
    }
    if (education) {
      await tx.doctorEducation.deleteMany({ where: { doctorId } });
      if (education.length) await tx.doctorEducation.createMany({ data: education.map((e) => ({ doctorId, ...e })) });
    }
  });
}

export async function list({ verification }, { page, pageSize }) {
  const where = verification ? { verificationStatus: verification } : {};
  const [items, total] = await prisma.$transaction([
    prisma.doctor.findMany({
      where, include: DOCTOR_WITH_USER, orderBy: { verificationSubmittedAt: 'asc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.doctor.count({ where }),
  ]);
  return { items, total };
}

export const findById = (id) => prisma.doctor.findUnique({ where: { id }, include: DOCTOR_WITH_USER });

export const update = (id, data) => prisma.doctor.update({ where: { id }, data, include: DOCTOR_WITH_USER });
