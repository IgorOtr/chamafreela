import { prisma } from '../../database/prisma.js';

export async function record({ actorId, action, entity, entityId, changes, ip }) {
  return prisma.auditLog.create({ data: { actorId, action, entity, entityId, changes, ip } });
}

export async function list({ page, pageSize, entity, entityId }) {
  const where = { ...(entity && { entity }), ...(entityId && { entityId }) };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
