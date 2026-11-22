// lookups.repository.js – reference data used by the sign-up and profile forms
import { prisma } from '../config/prisma.js';

const byName = { orderBy: { name: 'asc' } };

export async function findAll() {
  const [specialties, governorates, insurances, bloodTypes, languages] = await prisma.$transaction([
    prisma.specialty.findMany(byName),
    prisma.governorate.findMany({ orderBy: { id: 'asc' }, include: { cities: { orderBy: { name: 'asc' } } } }),
    prisma.insurance.findMany(byName),
    prisma.bloodType.findMany({ orderBy: { id: 'asc' } }),
    prisma.language.findMany(byName),
  ]);
  return { specialties, governorates, insurances, bloodTypes, languages };
}

export const specialtyExists = async (id) => (await prisma.specialty.count({ where: { id } })) > 0;
export const cityExists = async (id) => (await prisma.city.count({ where: { id } })) > 0;
export const insuranceExists = async (id) => (await prisma.insurance.count({ where: { id } })) > 0;
export const bloodTypeExists = async (id) => (await prisma.bloodType.count({ where: { id } })) > 0;
