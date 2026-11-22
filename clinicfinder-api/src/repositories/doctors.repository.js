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

export const existsByLicense = async (license) =>
  (await prisma.doctor.count({ where: { license } })) > 0;

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
