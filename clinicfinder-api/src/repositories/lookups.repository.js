// lookups.repository.js – reference data used by the sign-up and profile forms
import { prisma } from '../config/prisma.js';

const byName = { orderBy: { name: 'asc' } };

export async function findAll() {
  const [specialties, governorates, insurances, bloodTypes, languages, genders, clinics] = await prisma.$transaction([
    prisma.specialty.findMany(byName),
    prisma.governorate.findMany({ orderBy: { id: 'asc' }, include: { cities: { orderBy: { name: 'asc' } } } }),
    prisma.insurance.findMany(byName),
    prisma.bloodType.findMany({ orderBy: { id: 'asc' } }),
    prisma.language.findMany(byName),
    prisma.gender.findMany({ orderBy: { id: 'asc' } }),
    prisma.clinic.findMany({ orderBy: { name: 'asc' }, include: { clinicType: true, city: { include: { governorate: true } } } }),
  ]);
  return { specialties, governorates, insurances, bloodTypes, languages, genders, clinics };
}

export const specialtyExists = async (id) => (await prisma.specialty.count({ where: { id } })) > 0;
export const cityExists = async (id) => (await prisma.city.count({ where: { id } })) > 0;
export const insuranceExists = async (id) => (await prisma.insurance.count({ where: { id } })) > 0;
export const bloodTypeExists = async (id) => (await prisma.bloodType.count({ where: { id } })) > 0;
export const genderExists = async (id) => (await prisma.gender.count({ where: { id } })) > 0;
export const findClinic = (id) => prisma.clinic.findUnique({ where: { id }, select: { id: true, name: true, cityId: true } });

// For lists of ids: true only when EVERY id exists
export const languagesExist = async (ids) => (await prisma.language.count({ where: { id: { in: ids } } })) === ids.length;
export const insurancesExist = async (ids) => (await prisma.insurance.count({ where: { id: { in: ids } } })) === ids.length;
