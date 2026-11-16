import { prisma } from '../../database/prisma.js';
import { can } from '../../config/permissions.js';
import { forbidden, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';

const select = { id: true, name: true, email: true, role: true, status: true, createdAt: true };

export async function list({ page, pageSize, role, status, q }) {
  const where = {
    ...(role && { role }),
    ...(status && { status }),
    ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function update(actor, id, data, ip) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw notFound('Usuário não encontrado');
  // Somente SUPERADMIN mexe em papéis administrativos ou atribui-os.
  const adminRoles = ['SUPERADMIN', 'ADMIN', 'MODERADOR'];
  const touchesAdmin = adminRoles.includes(target.role) || (data.role && adminRoles.includes(data.role));
  if (touchesAdmin && !can(actor.role, '*')) throw forbidden('Apenas o superadministrador altera contas administrativas');
  if (target.id === actor.id && (data.status === 'SUSPENSO' || (data.role && data.role !== target.role)))
    throw forbidden('Você não pode suspender ou alterar o papel da própria conta');

  const updated = await prisma.user.update({ where: { id }, data, select });
  if (data.status === 'SUSPENSO') await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  await audit.record({
    actorId: actor.id, action: 'USER_UPDATE', entity: 'User', entityId: id, ip,
    changes: { de: { role: target.role, status: target.status }, para: { role: updated.role, status: updated.status } },
  });
  return updated;
}
