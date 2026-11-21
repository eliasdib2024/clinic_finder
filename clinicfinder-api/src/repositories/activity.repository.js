// activity.repository.js – admin activity feed and in-app notifications
import { prisma } from '../config/prisma.js';

export const logActivity = (text, kind, vars) =>
  prisma.activityLog.create({ data: { text, kind, vars } });

export const notify = (userId, { title, body, vars, link, kind = 'info' }) =>
  prisma.notification.create({ data: { userId, title, body, vars, link, kind } });

export async function notifyAdmins(notification) {
  const admins = await prisma.user.findMany({ where: { role: 'admin', status: 'active' }, select: { id: true } });
  if (!admins.length) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, kind: 'info', ...notification })),
  });
}
