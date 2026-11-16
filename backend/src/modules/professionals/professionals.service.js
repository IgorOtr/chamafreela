import crypto from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { slugify } from '../../utils/slugify.js';
import * as audit from '../audit/audit.service.js';

const include = { category: { select: { id: true, name: true, slug: true } }, services: true, areas: true, portfolio: { orderBy: { position: 'asc' } } };

// ---- Visão pública: nunca expõe userId, e-mail, motivo de rejeição, nem WhatsApp sem autorização.
function toPublic(p) {
  return {
    id: p.id, slug: p.slug, displayName: p.displayName, headline: p.headline, description: p.description,
    category: p.category, city: p.city, neighborhood: p.neighborhood, mode: p.mode, radiusKm: p.radiusKm,
    experience: p.experience, qualifications: p.qualifications, available: p.available, featured: p.featured,
    contact: p.showContact ? { whatsapp: p.whatsapp, other: p.otherContacts } : null,
    services: p.services?.map(({ id, name, description, priceInfo }) => ({ id, name, description, priceInfo })),
    areas: p.areas?.map(({ id, city, neighborhood, radiusKm }) => ({ id, city, neighborhood, radiusKm })),
    portfolio: p.portfolio?.map(({ id, type, url, caption }) => ({ id, type, url, caption })),
  };
}

async function uniqueSlug(base) {
  const root = slugify(base) || 'profissional';
  let slug = root;
  while (await prisma.professional.findUnique({ where: { slug } })) slug = `${root}-${crypto.randomBytes(2).toString('hex')}`;
  return slug;
}

async function assertCategory(categoryId) {
  const c = await prisma.category.findFirst({ where: { id: categoryId, active: true } });
  if (!c) throw badRequest('Categoria inválida', [{ campo: 'categoryId', mensagem: 'Categoria inválida ou inativa' }]);
}

// ---- Catálogo público
export async function catalog({ page, pageSize, q, category, city, neighborhood }) {
  const and = [{ status: 'APROVADO' }];
  if (q) and.push({ OR: [
    { displayName: { contains: q, mode: 'insensitive' } },
    { headline: { contains: q, mode: 'insensitive' } },
    { services: { some: { name: { contains: q, mode: 'insensitive' } } } },
  ] });
  if (category) and.push({ category: { slug: category } });
  if (city) and.push({ OR: [{ city: { equals: city, mode: 'insensitive' } }, { areas: { some: { city: { equals: city, mode: 'insensitive' } } } }] });
  if (neighborhood) and.push({ OR: [
    { neighborhood: { equals: neighborhood, mode: 'insensitive' } },
    { areas: { some: { neighborhood: { equals: neighborhood, mode: 'insensitive' } } } },
  ] });
  const where = { AND: and };
  const [items, total] = await Promise.all([
    prisma.professional.findMany({ where, include, orderBy: [{ featured: 'desc' }, { approvedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.professional.count({ where }),
  ]);
  return { items: items.map(toPublic), total, page, pageSize };
}

export async function publicProfile(slug) {
  const p = await prisma.professional.findFirst({ where: { slug, status: 'APROVADO' }, include });
  if (!p) throw notFound('Perfil não encontrado');
  return toPublic(p);
}

export async function cities() {
  const rows = await prisma.professional.findMany({ where: { status: 'APROVADO' }, select: { city: true }, distinct: ['city'], orderBy: { city: 'asc' } });
  return rows.map((r) => r.city);
}

// ---- Perfil do próprio profissional
export const getOwn = (userId) => prisma.professional.findUnique({ where: { userId }, include });

export async function saveOwn(user, data, ip) {
  await assertCategory(data.categoryId);
  const { services, areas, portfolio, ...fields } = data;
  const existing = await prisma.professional.findUnique({ where: { userId: user.id } });

  const nested = {
    services: { create: services },
    areas: { create: areas },
    portfolio: { create: portfolio.map((p, position) => ({ ...p, position })) },
  };
  let saved;
  if (!existing) {
    saved = await prisma.professional.create({
      data: { ...fields, userId: user.id, slug: await uniqueSlug(fields.displayName), status: 'PENDENTE', ...nested },
      include,
    });
  } else {
    // Perfil rejeitado volta à fila ao ser reenviado. Aprovado/oculto mantém o status (edições ficam na auditoria).
    const status = existing.status === 'REJEITADO' ? 'PENDENTE' : existing.status;
    saved = await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.service.deleteMany({ where: { professionalId: existing.id } }),
        tx.serviceArea.deleteMany({ where: { professionalId: existing.id } }),
        tx.portfolioItem.deleteMany({ where: { professionalId: existing.id } }),
      ]);
      return tx.professional.update({
        where: { id: existing.id },
        data: { ...fields, status, rejectionReason: status === 'PENDENTE' ? null : existing.rejectionReason, ...nested },
        include,
      });
    });
  }
  await audit.record({
    actorId: user.id, action: existing ? 'PROFESSIONAL_UPDATE' : 'PROFESSIONAL_SUBMIT', entity: 'Professional', entityId: saved.id, ip,
    changes: { status: saved.status, displayName: saved.displayName },
  });
  return saved;
}

// ---- Administração
export async function adminList({ page, pageSize, status, q }) {
  const where = {
    ...(status && { status }),
    ...(q && { OR: [{ displayName: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }] }),
  };
  const [items, total] = await Promise.all([
    prisma.professional.findMany({
      where, include: { ...include, user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.professional.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

const TRANSITIONS = {
  APROVAR: { from: ['PENDENTE', 'REJEITADO'], to: 'APROVADO' },
  REJEITAR: { from: ['PENDENTE', 'APROVADO'], to: 'REJEITADO' },
  OCULTAR: { from: ['APROVADO'], to: 'OCULTO' },
  REEXIBIR: { from: ['OCULTO'], to: 'APROVADO' },
};

export async function review(actor, id, { action, reason }, ip) {
  const p = await prisma.professional.findUnique({ where: { id } });
  if (!p) throw notFound('Perfil não encontrado');
  const t = TRANSITIONS[action];
  if (!t.from.includes(p.status)) throw badRequest(`Ação inválida para perfil ${p.status}`);
  const data = { status: t.to, rejectionReason: action === 'REJEITAR' ? reason : null };
  if (t.to === 'APROVADO') data.approvedAt = p.approvedAt ?? new Date();
  if (t.to !== 'APROVADO') data.featured = false;
  const updated = await prisma.professional.update({ where: { id }, data, include });
  await audit.record({ actorId: actor.id, action: `PROFESSIONAL_${action}`, entity: 'Professional', entityId: id, ip, changes: { de: p.status, para: t.to, motivo: reason } });
  return updated;
}

export async function adminEdit(actor, id, data, ip) {
  const p = await prisma.professional.findUnique({ where: { id } });
  if (!p) throw notFound('Perfil não encontrado');
  if (data.categoryId) await assertCategory(data.categoryId);
  if (data.featured && p.status !== 'APROVADO') throw badRequest('Somente perfis aprovados podem ser destacados');
  const updated = await prisma.professional.update({ where: { id }, data, include });
  const diff = Object.fromEntries(Object.keys(data).map((k) => [k, { de: p[k], para: data[k] }]));
  await audit.record({ actorId: actor.id, action: 'PROFESSIONAL_ADMIN_EDIT', entity: 'Professional', entityId: id, ip, changes: diff });
  return updated;
}
