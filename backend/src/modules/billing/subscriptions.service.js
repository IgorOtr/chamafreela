import { prisma } from '../../database/prisma.js';
import { billingEnabled, getGateway } from '../../integrations/payments/gateway.js';
import { isValidCpfCnpj } from '../../utils/cnpj.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';
import { toPublic } from '../plans/plans.service.js';
import { currentSubscription, getEntitlements, usageSummary } from './entitlements.js';

const STAFF = ['SUPERADMIN', 'ADMIN', 'MODERADOR'];
const publicSub = (s) => s && ({ id: s.id, planCode: s.planCode, status: s.status, source: s.source, startedAt: s.startedAt, endsAt: s.endsAt, promoEndsAt: s.promoEndsAt, priceCents: s.priceCents });

// ---- Visão do próprio usuário
export async function me(user) {
  const [ent, usage, plans, payments] = await Promise.all([
    getEntitlements(user), usageSummary(user),
    prisma.plan.findMany({ where: { active: true }, orderBy: { position: 'asc' } }),
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  const pending = ent.staff ? null : await prisma.subscription.findFirst({ where: { userId: user.id, status: 'PENDENTE', source: 'GATEWAY' }, orderBy: { createdAt: 'desc' } });
  return {
    staff: ent.staff, billingEnabled: billingEnabled(), pending: pending && { id: pending.id, planCode: pending.planCode, createdAt: pending.createdAt },
    plan: ent.plan ? toPublic(ent.plan) : null, subscription: publicSub(ent.subscription), usage,
    plans: plans.map(toPublic),
    payments: payments.map((p) => ({ id: p.id, amountCents: p.amountCents, currency: p.currency, status: p.status, method: p.method, paidAt: p.paidAt, createdAt: p.createdAt })),
  };
}

export async function cancel(user, ip, { byAdmin = null, subscriptionId = null } = {}) {
  const sub = subscriptionId ? await prisma.subscription.findUnique({ where: { id: subscriptionId } })
    : (await currentSubscription(user.id)) ?? (await prisma.subscription.findFirst({ where: { userId: user.id, status: 'PENDENTE' }, orderBy: { createdAt: 'desc' } }));
  if (!sub || !['ATIVA', 'PENDENTE'].includes(sub.status)) throw badRequest('Não há assinatura ativa para cancelar');
  if (sub.source === 'GATEWAY' && sub.gatewayRef) await getGateway().cancelSubscription(sub.gatewayRef);
  const updated = await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELADA', canceledAt: new Date() } });
  await audit.record({ actorId: (byAdmin ?? user).id, action: 'SUBSCRIPTION_CANCEL', entity: 'Subscription', entityId: sub.id, ip, changes: { usuario: sub.userId, plano: sub.planCode } });
  return updated;
}

// Troca de plano pelo próprio usuário. Planos pagos só operam com a cobrança habilitada (Asaas configurado).
export async function change(user, planCode, ip, { cpfCnpj, billingType } = {}) {
  if (STAFF.includes(user.role)) throw forbidden('Contas administrativas não possuem assinatura');
  const plan = await prisma.plan.findFirst({ where: { code: planCode, active: true } });
  if (!plan) throw notFound('Plano não encontrado');
  const current = await currentSubscription(user.id);
  if (plan.code === 'FREE') {
    if (current || (await prisma.subscription.count({ where: { userId: user.id, status: 'PENDENTE' } }))) await cancel(user, ip);
    return { plan: toPublic(plan), subscription: null };
  }
  // Quem tem o plano por concessão manual (cortesia) pode contratá-lo para continuar após o término.
  if (current?.planCode === plan.code && current.source === 'GATEWAY') throw conflict('Você já está neste plano');
  if (!plan.available) throw conflict('Este plano ainda não está disponível');
  if (!billingEnabled()) throw new AppError(409, 'A cobrança ainda não foi ativada. Nenhum pagamento é realizado neste momento.', 'BILLING_DISABLED');
  if (!cpfCnpj || !isValidCpfCnpj(cpfCnpj)) throw badRequest('Informe um CPF ou CNPJ válido para emitir a cobrança', [{ campo: 'cpfCnpj', mensagem: 'CPF/CNPJ inválido' }]);
  return startCheckout(user, plan, { cpfCnpj, billingType: billingType ?? 'UNDEFINED', ip });
}

async function startCheckout(user, plan, { cpfCnpj, billingType, ip }) {
  const gw = getGateway();
  // Checkouts antigos não concluídos são cancelados para não gerar cobranças duplicadas.
  const stale = await prisma.subscription.findMany({ where: { userId: user.id, status: 'PENDENTE', source: 'GATEWAY' } });
  for (const s of stale) {
    if (s.gatewayRef) await gw.cancelSubscription(s.gatewayRef).catch(() => {});
    await prisma.subscription.update({ where: { id: s.id }, data: { status: 'CANCELADA', canceledAt: new Date() } });
  }
  // A promoção vale só na primeira contratação paga do usuário.
  const firstTime = (await prisma.payment.count({ where: { userId: user.id, status: 'PAGO' } })) === 0;
  const promoApplied = firstTime && plan.promoPriceCents != null && plan.promoMonths != null;
  const valueCents = promoApplied ? plan.promoPriceCents : plan.priceCents;
  const local = await prisma.subscription.create({ data: { userId: user.id, planCode: plan.code, status: 'PENDENTE', source: 'GATEWAY', priceCents: valueCents } });
  try {
    const existing = await prisma.billingCustomer.findUnique({ where: { userId: user.id } });
    const customerId = await gw.ensureCustomer({ user, cpfCnpj, gatewayCustomerId: existing?.gatewayCustomerId });
    if (!existing) await prisma.billingCustomer.create({ data: { userId: user.id, gateway: gw.name, gatewayCustomerId: customerId } });
    const gatewayRef = await gw.createSubscription({ customerId, plan, valueCents, billingType, reference: local.id });
    await prisma.subscription.update({ where: { id: local.id }, data: { gatewayRef } });
    const checkoutUrl = await gw.firstPaymentUrl(gatewayRef);
    await audit.record({ actorId: user.id, action: 'SUBSCRIPTION_CHECKOUT', entity: 'Subscription', entityId: local.id, ip, changes: { plano: plan.code, valorCentavos: valueCents, promocao: promoApplied } });
    return { checkoutUrl, subscriptionId: local.id, promoApplied, amountCents: valueCents };
  } catch (e) {
    await prisma.subscription.update({ where: { id: local.id }, data: { status: 'CANCELADA', canceledAt: new Date() } });
    throw e;
  }
}

// Reabre o link de pagamento de uma contratação pendente.
export async function pendingLink(user) {
  const sub = await prisma.subscription.findFirst({ where: { userId: user.id, status: 'PENDENTE', source: 'GATEWAY', gatewayRef: { not: null } }, orderBy: { createdAt: 'desc' } });
  if (!sub) throw notFound('Nenhuma contratação pendente');
  return { checkoutUrl: await getGateway().firstPaymentUrl(sub.gatewayRef) };
}

// ---- Administração
export async function adminList({ page, pageSize, status, planCode, q }) {
  const where = {
    ...(status && { status }), ...(planCode && { planCode }),
    ...(q && { user: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } }),
  };
  const [items, total] = await Promise.all([
    prisma.subscription.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { id: true, name: true, email: true, role: true } } } }),
    prisma.subscription.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

// Concessão MANUAL pela administração (cortesia, parceria, teste). Não gera cobrança.
export async function grant(actor, { userId, planCode, endsAt, note }, ip) {
  const [user, plan] = await Promise.all([prisma.user.findUnique({ where: { id: userId } }), prisma.plan.findFirst({ where: { code: planCode, active: true } })]);
  if (!user) throw notFound('Usuário não encontrado');
  if (!plan) throw notFound('Plano não encontrado');
  if (STAFF.includes(user.role)) throw badRequest('Contas administrativas não possuem assinatura');
  if (endsAt && endsAt <= new Date()) throw badRequest('A data de término deve ser futura');
  const sub = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({ where: { userId, status: 'ATIVA' }, data: { status: 'CANCELADA', canceledAt: new Date() } });
    if (plan.code === 'FREE') return null;
    return tx.subscription.create({ data: { userId, planCode, source: 'MANUAL', priceCents: 0, endsAt: endsAt ?? null, note: note ?? null, grantedById: actor.id } });
  });
  await audit.record({ actorId: actor.id, action: 'SUBSCRIPTION_GRANT', entity: 'Subscription', entityId: sub?.id ?? userId, ip, changes: { usuario: user.email, plano: planCode, ate: endsAt ?? null, nota: note ?? null } });
  return sub;
}

export const adminCancel = async (actor, id, ip) => {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) throw notFound('Assinatura não encontrada');
  return cancel({ id: sub.userId }, ip, { byAdmin: actor, subscriptionId: id });
};
