import { prisma } from '../../database/prisma.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';
import { detectFlags } from './fraud.js';

const MAX_PENDING_PER_COMPANY = 5;
const categorySel = { select: { id: true, name: true, slug: true } };
const withExpired = (o) => ({ ...o, expired: o.status === 'PUBLICADA' && o.deadline < new Date() });

// Visão pública: sem canal de contato, sem flags internas, sem motivo de rejeição, sem dados privados da empresa.
const toPublic = (o) => ({
  id: o.id, title: o.title, description: o.description, category: o.category, city: o.city, neighborhood: o.neighborhood,
  mode: o.mode, deadline: o.deadline, contractType: o.contractType, requirements: o.requirements,
  payMin: o.payMin, payMax: o.payMax, publishedAt: o.publishedAt,
  company: { tradeName: o.company.tradeName, city: o.company.city, description: o.company.description },
});
const publicInclude = { category: categorySel, company: { select: { tradeName: true, city: true, description: true } } };
const visibleWhere = () => ({ status: 'PUBLICADA', deadline: { gte: new Date() }, company: { status: 'ATIVA' } });

export async function catalog({ page, pageSize, q, category, city, contractType }) {
  const and = [visibleWhere()];
  if (q) and.push({ OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] });
  if (category) and.push({ category: { slug: category } });
  if (city) and.push({ city: { equals: city, mode: 'insensitive' } });
  if (contractType) and.push({ contractType });
  const where = { AND: and };
  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({ where, include: publicInclude, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.opportunity.count({ where }),
  ]);
  return { items: items.map(toPublic), total, page, pageSize };
}

async function professionalOf(user) {
  return user?.role === 'PROFISSIONAL' ? prisma.professional.findUnique({ where: { userId: user.id } }) : null;
}

export async function detail(id, user) {
  const o = await prisma.opportunity.findFirst({ where: { id, ...visibleWhere() }, include: publicInclude });
  if (!o) throw notFound('Oportunidade não encontrada');
  const result = toPublic(o);
  const pro = await professionalOf(user);
  if (pro) {
    const interest = await prisma.interest.findUnique({ where: { opportunityId_professionalId: { opportunityId: id, professionalId: pro.id } } });
    result.myInterest = interest ? { id: interest.id, message: interest.message, createdAt: interest.createdAt } : null;
    // O canal de contato só é revelado a quem manifestou interesse.
    if (interest) result.contactChannel = (await prisma.opportunity.findUnique({ where: { id } })).contactChannel;
  }
  return result;
}

export async function cities() {
  const rows = await prisma.opportunity.findMany({ where: visibleWhere(), select: { city: true }, distinct: ['city'], orderBy: { city: 'asc' } });
  return rows.map((r) => r.city);
}

// ---- Empresa
async function activeCompany(user) {
  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) throw badRequest('Complete o perfil empresarial antes de publicar oportunidades');
  if (company.status !== 'ATIVA') throw forbidden('Sua empresa está suspensa. Entre em contato com a administração.');
  return company;
}

async function ownOpportunity(user, id) {
  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  const o = company && (await prisma.opportunity.findFirst({ where: { id, companyId: company.id } }));
  if (!o) throw notFound('Oportunidade não encontrada');
  return { company, o };
}

async function assertCategory(categoryId) {
  if (!(await prisma.category.findFirst({ where: { id: categoryId, active: true } })))
    throw badRequest('Categoria inválida', [{ campo: 'categoryId', mensagem: 'Categoria inválida ou inativa' }]);
}

export async function create(user, data, ip) {
  const company = await activeCompany(user);
  await assertCategory(data.categoryId);
  const pending = await prisma.opportunity.count({ where: { companyId: company.id, status: 'PENDENTE' } });
  if (pending >= MAX_PENDING_PER_COMPANY) throw conflict(`Você já possui ${MAX_PENDING_PER_COMPANY} oportunidades aguardando aprovação`);
  const flags = detectFlags(data.title, data.description, data.requirements, data.contactChannel);
  const o = await prisma.opportunity.create({ data: { ...data, companyId: company.id, flags }, include: { category: categorySel } });
  await audit.record({ actorId: user.id, action: 'OPPORTUNITY_SUBMIT', entity: 'Opportunity', entityId: o.id, ip, changes: { title: o.title, flags } });
  return o;
}

export async function update(user, id, data, ip) {
  const { company, o } = await ownOpportunity(user, id);
  if (company.status !== 'ATIVA') throw forbidden('Sua empresa está suspensa.');
  if (o.status === 'ENCERRADA') throw badRequest('Oportunidades encerradas não podem ser editadas');
  await assertCategory(data.categoryId);
  const flags = detectFlags(data.title, data.description, data.requirements, data.contactChannel);
  // Qualquer edição exige nova aprovação: o conteúdo moderado mudou.
  const updated = await prisma.opportunity.update({
    where: { id }, data: { ...data, flags, status: 'PENDENTE', rejectionReason: null, publishedAt: null }, include: { category: categorySel },
  });
  await audit.record({ actorId: user.id, action: 'OPPORTUNITY_UPDATE', entity: 'Opportunity', entityId: id, ip, changes: { de: o.status, para: 'PENDENTE', flags } });
  return updated;
}

export async function close(user, id, ip) {
  const { o } = await ownOpportunity(user, id);
  if (o.status === 'ENCERRADA') throw badRequest('Oportunidade já encerrada');
  const updated = await prisma.opportunity.update({ where: { id }, data: { status: 'ENCERRADA', closedAt: new Date() } });
  await audit.record({ actorId: user.id, action: 'OPPORTUNITY_CLOSE', entity: 'Opportunity', entityId: id, ip, changes: { de: o.status } });
  return updated;
}

export async function mine(user) {
  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return [];
  const items = await prisma.opportunity.findMany({
    where: { companyId: company.id }, include: { category: categorySel, _count: { select: { interests: true } } }, orderBy: { createdAt: 'desc' },
  });
  return items.map(withExpired);
}

export async function interestsOf(user, id) {
  await ownOpportunity(user, id);
  const rows = await prisma.interest.findMany({
    where: { opportunityId: id }, orderBy: { createdAt: 'desc' },
    include: { professional: { include: { category: categorySel, services: true } } },
  });
  return rows.map((i) => ({
    id: i.id, message: i.message, createdAt: i.createdAt,
    professional: {
      slug: i.professional.slug, displayName: i.professional.displayName, headline: i.professional.headline,
      category: i.professional.category, city: i.professional.city, services: i.professional.services.map((s) => s.name),
      // Respeita a autorização de contato do profissional.
      contact: i.professional.showContact ? { whatsapp: i.professional.whatsapp, other: i.professional.otherContacts } : null,
    },
  }));
}

// ---- Profissional
export async function expressInterest(user, id, { message }) {
  const pro = await professionalOf(user);
  if (!pro || pro.status !== 'APROVADO') throw forbidden('Seu perfil profissional precisa estar aprovado para manifestar interesse');
  const o = await prisma.opportunity.findFirst({ where: { id, ...visibleWhere() } });
  if (!o) throw notFound('Oportunidade não encontrada ou não está mais disponível');
  const interest = await prisma.interest.upsert({
    where: { opportunityId_professionalId: { opportunityId: id, professionalId: pro.id } },
    update: { message }, create: { opportunityId: id, professionalId: pro.id, message },
  });
  return { id: interest.id, message: interest.message, createdAt: interest.createdAt, contactChannel: o.contactChannel };
}

export async function withdrawInterest(user, id) {
  const pro = await professionalOf(user);
  if (!pro) throw forbidden();
  await prisma.interest.deleteMany({ where: { opportunityId: id, professionalId: pro.id } });
}

export async function myInterests(user) {
  const pro = await professionalOf(user);
  if (!pro) return [];
  const rows = await prisma.interest.findMany({
    where: { professionalId: pro.id }, orderBy: { createdAt: 'desc' },
    include: { opportunity: { include: { category: categorySel, company: { select: { tradeName: true } } } } },
  });
  return rows.map((i) => ({
    id: i.id, message: i.message, createdAt: i.createdAt,
    opportunity: {
      id: i.opportunity.id, title: i.opportunity.title, city: i.opportunity.city, category: i.opportunity.category, company: i.opportunity.company,
      deadline: i.opportunity.deadline, status: i.opportunity.status,
      available: i.opportunity.status === 'PUBLICADA' && i.opportunity.deadline >= new Date(),
      contactChannel: i.opportunity.status === 'PUBLICADA' ? i.opportunity.contactChannel : null,
    },
  }));
}

// ---- Administração
export async function adminList({ page, pageSize, status, q }) {
  const where = {
    ...(status && { status }),
    ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { company: { tradeName: { contains: q, mode: 'insensitive' } } }] }),
  };
  const [items, total] = await Promise.all([
    prisma.opportunity.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      include: { category: categorySel, company: { select: { id: true, tradeName: true, cnpj: true, status: true, user: { select: { email: true } } } }, _count: { select: { interests: true } } },
    }),
    prisma.opportunity.count({ where }),
  ]);
  return { items: items.map(withExpired), total, page, pageSize };
}

const TRANSITIONS = {
  APROVAR: { from: ['PENDENTE', 'REJEITADA'], to: 'PUBLICADA' },
  REJEITAR: { from: ['PENDENTE', 'PUBLICADA'], to: 'REJEITADA' },
  ENCERRAR: { from: ['PENDENTE', 'PUBLICADA'], to: 'ENCERRADA' },
};

export async function review(actor, id, { action, reason }, ip) {
  const o = await prisma.opportunity.findUnique({ where: { id } });
  if (!o) throw notFound('Oportunidade não encontrada');
  const t = TRANSITIONS[action];
  if (!t.from.includes(o.status)) throw badRequest(`Ação inválida para oportunidade ${o.status}`);
  if (action === 'APROVAR' && o.deadline < new Date()) throw badRequest('O prazo desta oportunidade já expirou');
  const data = { status: t.to, rejectionReason: action === 'REJEITAR' ? reason : null };
  if (t.to === 'PUBLICADA') data.publishedAt = new Date();
  if (t.to === 'ENCERRADA') data.closedAt = new Date();
  const updated = await prisma.opportunity.update({ where: { id }, data, include: { category: categorySel } });
  await audit.record({ actorId: actor.id, action: `OPPORTUNITY_${action}`, entity: 'Opportunity', entityId: id, ip, changes: { de: o.status, para: t.to, motivo: reason, flags: o.flags } });
  return updated;
}
