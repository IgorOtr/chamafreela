import { prisma } from '../../database/prisma.js';
import { conflict, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';

export const getOwn = (userId) => prisma.company.findUnique({ where: { userId } });

export async function saveOwn(user, data, ip) {
  if (data.cnpj) {
    const other = await prisma.company.findUnique({ where: { cnpj: data.cnpj } });
    if (other && other.userId !== user.id) throw conflict('CNPJ já cadastrado em outra conta');
  }
  const existing = await getOwn(user.id);
  const payload = { ...data, cnpj: data.cnpj ?? null };
  const saved = existing
    ? await prisma.company.update({ where: { id: existing.id }, data: payload })
    : await prisma.company.create({ data: { ...payload, userId: user.id } });
  await audit.record({ actorId: user.id, action: existing ? 'COMPANY_UPDATE' : 'COMPANY_CREATE', entity: 'Company', entityId: saved.id, ip, changes: { tradeName: saved.tradeName } });
  return saved;
}

export async function adminList({ page, pageSize, q }) {
  const where = q ? { OR: [{ tradeName: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {};
  const [items, total] = await Promise.all([
    prisma.company.findMany({ where, include: { user: { select: { name: true, email: true } }, _count: { select: { opportunities: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.company.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function setStatus(actor, id, status, ip) {
  const c = await prisma.company.findUnique({ where: { id } });
  if (!c) throw notFound('Empresa não encontrada');
  const updated = await prisma.company.update({ where: { id }, data: { status } });
  await audit.record({ actorId: actor.id, action: 'COMPANY_STATUS', entity: 'Company', entityId: id, ip, changes: { de: c.status, para: status } });
  return updated;
}
