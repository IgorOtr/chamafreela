import { prisma } from '../../database/prisma.js';

export const create = (userId, { type, title, body, link }) => prisma.notification.create({ data: { userId, type, title, body, link } });

export async function list(userId) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export const markRead = (userId, id) => prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
export const markAllRead = (userId) => prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
export const preferences = (userId) => prisma.user.findUnique({ where: { id: userId }, select: { notifyRecommendations: true } });
export const setPreferences = (userId, notifyRecommendations) => prisma.user.update({ where: { id: userId }, data: { notifyRecommendations }, select: { notifyRecommendations: true } });
