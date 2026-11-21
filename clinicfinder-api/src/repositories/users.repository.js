// users.repository.js – the only place that reads/writes the users table
import { prisma } from '../config/prisma.js';
import { USER_PROFILE_INCLUDE } from './includes.js';

// Small query used on every authenticated request
export const findAuthState = (id) =>
  prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });

// Includes passwordHash – only the auth service uses this
export const findByEmailWithPassword = (email) =>
  prisma.user.findUnique({ where: { email }, include: USER_PROFILE_INCLUDE });

export const existsByEmail = async (email) =>
  (await prisma.user.count({ where: { email } })) > 0;

export const findById = (id) =>
  prisma.user.findUnique({ where: { id }, include: USER_PROFILE_INCLUDE });

function whereFrom({ role, status, search }) {
  return {
    ...(role && { role }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }),
  };
}

export async function list(filters, { page, pageSize }) {
  const where = whereFrom(filters);
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where, include: USER_PROFILE_INCLUDE, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export const update = (id, data) =>
  prisma.user.update({ where: { id }, data, include: USER_PROFILE_INCLUDE });

export const remove = (id) => prisma.user.delete({ where: { id } });
