import { prisma } from '../../database/prisma.js';
import { getGateway } from '../../integrations/payments/gateway.js';
import * as audit from '../audit/audit.service.js';
import { recordEvent } from '../reports/events.js';

const GATEWAY = 'asaas';
const PAID = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
const FAILED = new Set(['PAYMENT_OVERDUE', 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED']);
const REFUNDED = new Set(['PAYMENT_REFUNDED', 'PAYMENT_PARTIALLY_REFUNDED']);
const SUB_ENDED = new Set(['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED']);

const toDate = (s) => (s ? new Date(`${s}T12:00:00Z`) : null);

async function onPayment(type, p) {
  const sub = p.subscription && (await prisma.subscription.findFirst({ where: { gatewayRef: p.subscription }, include: { plan: true } }));
  if (!sub) {
    await recordEvent({ level: 'warn', source: 'asaas', message: `${type}: cobrança ${p.id} sem assinatura local (subscription=${p.subscription ?? 'n/d'})` });
    return;
  }
  const existing = await prisma.payment.findUnique({ where: { gatewayRef: p.id } });
  let status = existing?.status ?? 'PENDENTE';
  if (PAID.has(type)) status = 'PAGO';
  else if (FAILED.has(type)) status = existing?.status === 'PAGO' ? 'PAGO' : 'FALHOU';
  else if (REFUNDED.has(type)) status = 'REEMBOLSADO';
  const data = { subscriptionId: sub.id, userId: sub.userId, amountCents: Math.round(Number(p.value) * 100), status, method: p.billingType ?? null, paidAt: status === 'PAGO' ? (existing?.paidAt ?? toDate(p.paymentDate) ?? new Date()) : (existing?.paidAt ?? null) };
  await prisma.payment.upsert({ where: { gatewayRef: p.id }, update: data, create: { ...data, gatewayRef: p.id } });

  if (PAID.has(type)) {
    // Ativa a assinatura e encerra qualquer outra ativa do usuário (ex.: concessão manual).
    await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({ where: { userId: sub.userId, status: 'ATIVA', id: { not: sub.id } }, data: { status: 'CANCELADA', canceledAt: new Date() } });
      if (sub.status !== 'ATIVA') await tx.subscription.update({ where: { id: sub.id }, data: { status: 'ATIVA', canceledAt: null, endsAt: null, startedAt: sub.status === 'PENDENTE' ? new Date() : sub.startedAt } });
    });
    if (sub.status !== 'ATIVA') await audit.record({ actorId: null, action: 'SUBSCRIPTION_ACTIVATED', entity: 'Subscription', entityId: sub.id, changes: { usuario: sub.userId, plano: sub.planCode, pagamento: p.id } });
    await maybeEndPromo(sub, p);
  } else if (FAILED.has(type) && sub.status === 'ATIVA') {
    // Inadimplência suspende os benefícios; o pagamento posterior reativa.
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'EXPIRADA' } });
    await audit.record({ actorId: null, action: 'SUBSCRIPTION_SUSPENDED', entity: 'Subscription', entityId: sub.id, changes: { usuario: sub.userId, motivo: type, pagamento: p.id } });
  }
}

// Fim da promoção: após N cobranças pagas, a assinatura passa ao valor cheio do plano.
async function maybeEndPromo(sub, p) {
  const plan = sub.plan;
  if (!plan.promoMonths || plan.promoPriceCents == null || sub.priceCents !== plan.promoPriceCents || sub.promoEndsAt) return;
  const paid = await prisma.payment.count({ where: { subscriptionId: sub.id, status: 'PAGO' } });
  if (paid < plan.promoMonths) return;
  try {
    await getGateway().updateSubscriptionValue(sub.gatewayRef, plan.priceCents);
    await prisma.subscription.update({ where: { id: sub.id }, data: { priceCents: plan.priceCents, promoEndsAt: new Date() } });
    await audit.record({ actorId: null, action: 'SUBSCRIPTION_PROMO_ENDED', entity: 'Subscription', entityId: sub.id, changes: { de: plan.promoPriceCents, para: plan.priceCents, cobranca: p.id } });
  } catch (e) {
    await recordEvent({ level: 'error', source: 'asaas', message: `Falha ao encerrar promoção da assinatura ${sub.id}: ${e.message}` });
  }
}

async function onSubscriptionEnded(type, s) {
  const sub = await prisma.subscription.findFirst({ where: { gatewayRef: s.id } });
  if (!sub || sub.status === 'CANCELADA') return;
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELADA', canceledAt: new Date() } });
  await audit.record({ actorId: null, action: 'SUBSCRIPTION_CANCEL', entity: 'Subscription', entityId: sub.id, changes: { usuario: sub.userId, origem: type } });
}

// Processa um webhook já autenticado. Idempotente: o mesmo evento nunca é aplicado duas vezes.
export async function handleWebhook(payload) {
  const type = String(payload?.event ?? '');
  const eventId = payload?.id ? String(payload.id) : payload?.payment?.id ? `${type}|${payload.payment.id}|${payload.payment.status ?? ''}` : '';
  if (!type || !eventId) return { ignored: true };
  const key = { gateway_eventId: { gateway: GATEWAY, eventId } };
  const seen = await prisma.webhookEvent.findUnique({ where: key });
  if (seen?.processedAt) return { duplicate: true };
  if (!seen) await prisma.webhookEvent.create({ data: { gateway: GATEWAY, eventId, type } }).catch(() => {});

  if (type.startsWith('PAYMENT_') && payload.payment) await onPayment(type, payload.payment);
  else if (SUB_ENDED.has(type) && payload.subscription) await onSubscriptionEnded(type, payload.subscription);

  await prisma.webhookEvent.update({ where: key, data: { processedAt: new Date() } });
  return { processed: true };
}
