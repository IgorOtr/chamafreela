import { prisma } from '../../database/prisma.js';
import { can } from '../../config/permissions.js';
import { badRequest, forbidden, notFound } from '../../utils/errors.js';
import { getFreeCapacity } from './capacity.js';
import * as audit from '../audit/audit.service.js';
import { billingEnabled } from '../../integrations/payments/gateway.js';

export const toPublic = (p) => ({
  code: p.code, name: p.name, tagline: p.tagline, priceCents: p.priceCents, promoPriceCents: p.promoPriceCents, promoMonths: p.promoMonths,
  promoNote: p.promoNote, features: p.features, limits: p.limits ?? {}, available: p.available, highlighted: p.highlighted,
});

export async function listPublic() {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
  return { billingEnabled: billingEnabled(), plans: plans.map(toPublic) };
}

export async function listAdmin() {
  const [plans, counts, freeCapacity] = await Promise.all([
    prisma.plan.findMany({ orderBy: { position: 'asc' } }),
    prisma.subscription.groupBy({ by: ['planCode'], where: { status: 'ATIVA' }, _count: { _all: true } }),
    getFreeCapacity(),
  ]);
  return { billingEnabled: billingEnabled(), freeCapacity, plans: plans.map((p) => ({ ...p, activeSubscribers: counts.find((c) => c.planCode === p.code)?._count._all ?? 0 })) };
}

export async function update(actor, code, data, ip) {
  const plan = await prisma.plan.findUnique({ where: { code } });
  if (!plan) throw notFound('Plano não encontrado');
  if ('maxUsers' in data) {
    // O limite de cadastros é uma decisão do superadministrador (administradores comuns apenas visualizam).
    if (!can(actor.role, '*')) throw forbidden('Apenas o superadministrador altera o limite de cadastros do plano FREE');
    if (code !== 'FREE') throw badRequest('O limite de cadastros só existe no plano FREE');
  }
  if (code === 'FREE') {
    if (data.priceCents != null && data.priceCents !== 0) throw badRequest('O plano FREE deve permanecer gratuito');
    if (data.active === false) throw badRequest('O plano FREE não pode ser desativado');
    if (data.available === false) throw badRequest('O plano FREE deve permanecer disponível');
  }
  const next = { ...plan, ...data };
  if (next.promoPriceCents != null && next.promoPriceCents >= next.priceCents) throw badRequest('O valor promocional deve ser menor que o valor do plano');
  if ((next.promoPriceCents == null) !== (next.promoMonths == null)) throw badRequest('Informe o valor promocional e a duração (em meses) juntos, ou nenhum dos dois');
  const updated = await prisma.plan.update({ where: { code }, data });
  const changes = Object.fromEntries(Object.keys(data).map((k) => [k, { de: plan[k], para: updated[k] }]));
  await audit.record({ actorId: actor.id, action: 'PLAN_UPDATE', entity: 'Plan', entityId: code, ip, changes });
  return updated;
}
