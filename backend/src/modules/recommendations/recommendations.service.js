import { prisma } from '../../database/prisma.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';
import * as notifications from '../notifications/notifications.service.js';
import { DEFAULT_CONFIG, scoreMatch, validateWeights } from './matching.js';

const CONFIG_ID = 'default';
const proInclude = { services: true, areas: true, user: { select: { id: true, notifyRecommendations: true } } };
const oppInclude = { category: { select: { id: true, name: true, slug: true } } };
const visibleOpp = () => ({ status: 'PUBLICADA', deadline: { gte: new Date() }, company: { status: 'ATIVA' } });

export async function getConfig() {
  const row = await prisma.matchConfig.findUnique({ where: { id: CONFIG_ID } });
  return row ? { weights: row.weights, minScore: row.minScore, updatedAt: row.updatedAt } : { ...DEFAULT_CONFIG, updatedAt: null };
}

export async function setConfig(actor, { weights, minScore }, ip) {
  const err = validateWeights(weights);
  if (err) throw badRequest(err);
  const before = await getConfig();
  await prisma.matchConfig.upsert({
    where: { id: CONFIG_ID }, update: { weights, minScore, updatedById: actor.id }, create: { id: CONFIG_ID, weights, minScore, updatedById: actor.id },
  });
  await audit.record({ actorId: actor.id, action: 'MATCH_CONFIG_UPDATE', entity: 'MatchConfig', entityId: CONFIG_ID, ip, changes: { de: { weights: before.weights, minScore: before.minScore }, para: { weights, minScore } } });
  await recomputeAll();
  return getConfig();
}

// Calcula e persiste. Cria notificação apenas para recomendações NOVAS, e só se o usuário permitir.
async function persist(pairs, config) {
  const created = [];
  for (const { pro, opp } of pairs) {
    const r = scoreMatch(pro, opp, config);
    const key = { opportunityId_professionalId: { opportunityId: opp.id, professionalId: pro.id } };
    if (!r.eligible) {
      await prisma.recommendation.deleteMany({ where: { opportunityId: opp.id, professionalId: pro.id } });
      continue;
    }
    const existing = await prisma.recommendation.findUnique({ where: key });
    const data = { score: r.score, breakdown: r.breakdown, justification: r.justification };
    if (existing) await prisma.recommendation.update({ where: key, data });
    else {
      await prisma.recommendation.create({ data: { ...data, opportunityId: opp.id, professionalId: pro.id } });
      created.push({ pro, opp, score: r.score });
    }
  }
  return created;
}

async function notifyNew(created, { perProfessionalSummary }) {
  const byUser = new Map();
  for (const c of created) {
    if (!c.pro.user.notifyRecommendations) continue;
    byUser.set(c.pro.user.id, [...(byUser.get(c.pro.user.id) ?? []), c]);
  }
  for (const [userId, items] of byUser) {
    if (perProfessionalSummary && items.length > 1) {
      await notifications.create(userId, { type: 'RECOMMENDATION', title: `${items.length} oportunidades compatíveis com seu perfil`, body: 'Veja as oportunidades recomendadas e por que foram indicadas.', link: '/painel/recomendadas' });
    } else {
      for (const { opp, score } of items) {
        await notifications.create(userId, { type: 'RECOMMENDATION', title: 'Nova oportunidade compatível', body: `${opp.title} — ${score}% de compatibilidade`, link: '/painel/recomendadas' });
      }
    }
  }
}

export async function recomputeForOpportunity(opportunityId) {
  const opp = await prisma.opportunity.findFirst({ where: { id: opportunityId, ...visibleOpp() }, include: oppInclude });
  if (!opp) { await prisma.recommendation.deleteMany({ where: { opportunityId } }); return; }
  const [config, pros] = await Promise.all([getConfig(), prisma.professional.findMany({ where: { status: 'APROVADO' }, include: proInclude })]);
  await prisma.recommendation.deleteMany({ where: { opportunityId, professionalId: { notIn: pros.map((p) => p.id) } } });
  const created = await persist(pros.map((pro) => ({ pro, opp })), config);
  await notifyNew(created, { perProfessionalSummary: false });
}

export async function recomputeForProfessional(professionalId) {
  const pro = await prisma.professional.findFirst({ where: { id: professionalId, status: 'APROVADO' }, include: proInclude });
  if (!pro) { await prisma.recommendation.deleteMany({ where: { professionalId } }); return; }
  const [config, opps] = await Promise.all([getConfig(), prisma.opportunity.findMany({ where: visibleOpp(), include: oppInclude })]);
  await prisma.recommendation.deleteMany({ where: { professionalId, opportunityId: { notIn: opps.map((o) => o.id) } } });
  const created = await persist(opps.map((opp) => ({ pro, opp })), config);
  await notifyNew(created, { perProfessionalSummary: true });
}

export async function recomputeAll() {
  const opps = await prisma.opportunity.findMany({ where: visibleOpp(), select: { id: true } });
  await prisma.recommendation.deleteMany({ where: { opportunityId: { notIn: opps.map((o) => o.id) } } });
  for (const { id } of opps) await recomputeForOpportunity(id);
}

// Falhas no motor não devem derrubar a operação principal (aprovação etc.), mas precisam ficar visíveis.
export async function safely(fn) {
  try { await fn(); } catch (e) { console.error('[conecta] falha ao recalcular recomendações:', e); }
}

export async function listMine(user) {
  const pro = await prisma.professional.findUnique({ where: { userId: user.id } });
  if (!pro || pro.status !== 'APROVADO') return [];
  const rows = await prisma.recommendation.findMany({
    where: { professionalId: pro.id, dismissedAt: null, opportunity: visibleOpp() },
    orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
    include: { opportunity: { include: { category: oppInclude.category, company: { select: { tradeName: true } } } } },
  });
  const interests = await prisma.interest.findMany({ where: { professionalId: pro.id }, select: { opportunityId: true } });
  const interested = new Set(interests.map((i) => i.opportunityId));
  return rows.map((r) => ({
    id: r.id, score: r.score, justification: r.justification, breakdown: r.breakdown, createdAt: r.createdAt,
    interested: interested.has(r.opportunityId),
    opportunity: {
      id: r.opportunity.id, title: r.opportunity.title, category: r.opportunity.category, city: r.opportunity.city, neighborhood: r.opportunity.neighborhood,
      mode: r.opportunity.mode, deadline: r.opportunity.deadline, contractType: r.opportunity.contractType, payMin: r.opportunity.payMin, payMax: r.opportunity.payMax,
      company: r.opportunity.company,
    },
  }));
}

export async function dismiss(user, id) {
  const pro = await prisma.professional.findUnique({ where: { userId: user.id } });
  const rec = pro && (await prisma.recommendation.findFirst({ where: { id, professionalId: pro.id } }));
  if (!rec) throw notFound('Recomendação não encontrada');
  await prisma.recommendation.update({ where: { id }, data: { dismissedAt: new Date() } });
}

export async function matchesForOpportunity(opportunityId) {
  const rows = await prisma.recommendation.findMany({
    where: { opportunityId }, orderBy: { score: 'desc' },
    include: { professional: { select: { displayName: true, slug: true, category: { select: { name: true } } } } },
  });
  return rows.map((r) => ({ id: r.id, score: r.score, justification: r.justification, professional: r.professional }));
}
export { forbidden };
