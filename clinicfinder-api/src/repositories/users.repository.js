// users.repository.js – the only place that reads/writes the users table
import { prisma } from '../config/prisma.js';
import { USER_PROFILE_INCLUDE } from './includes.js';

// Small query used on every authenticated request (passwordHash: to sign out sessions after a password change)
export const findAuthState = (id) =>
  prisma.user.findUnique({ where: { id }, select: { id: true, role: true, status: true, passwordHash: true } });

// ---- password reset (only the password-reset service uses these) ----

const RESET_SELECT = {
  id: true, email: true, fullName: true, status: true, language: true, passwordHash: true,
  resetCode: true, resetCodeExpiry: true, resetCodeAttempts: true, resetCodeVerified: true,
};

export const findForPasswordResetByEmail = (email) =>
  prisma.user.findUnique({ where: { email }, select: RESET_SELECT });

export const findForPasswordResetById = (id) =>
  prisma.user.findUnique({ where: { id }, select: RESET_SELECT });

// A new code replaces any previous one (only the latest code works) and resets the attempt counter
export const saveResetCode = (id, codeHash, expiry) =>
  prisma.user.update({
    where: { id },
    data: { resetCode: codeHash, resetCodeExpiry: expiry, resetCodeAttempts: 0, resetCodeVerified: false },
  });

// Counts one attempt atomically (two requests at the same time both count) and returns the new total
export async function countResetAttempt(id) {
  const { resetCodeAttempts } = await prisma.user.update({
    where: { id },
    data: { resetCodeAttempts: { increment: 1 } },
    select: { resetCodeAttempts: true },
  });
  return resetCodeAttempts;
}

export const markResetCodeVerified = (id) =>
  prisma.user.update({ where: { id }, data: { resetCodeVerified: true } });

// Sets the new password and clears the code in ONE conditional update: it only succeeds if the code
// is still the verified one, so the same reset can never be used twice (even by two requests at once).
export async function completePasswordReset(id, expectedCodeHash, passwordHash) {
  const { count } = await prisma.user.updateMany({
    where: { id, resetCode: expectedCodeHash, resetCodeVerified: true },
    data: {
      passwordHash,
      resetCode: null, resetCodeExpiry: null, resetCodeAttempts: 0, resetCodeVerified: false,
    },
  });
  return count === 1;
}

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
