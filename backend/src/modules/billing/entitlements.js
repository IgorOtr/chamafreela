import crypto from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../utils/errors.js';

// Limites controlados pelos planos. Valor ausente/nulo = ilimitado. Os valores são definidos pela administração.
export const LIMIT_KEYS = {
  simulationsPerMonth: { counter: 'simulations', label: 'Simulações do CHAMALÁ Insights por mês' },
  studioGenerationsPerMonth: { counter: 'studioGenerations', label: 'Gerações de texto e calendário do Studio por mês' },
  studioAssets: { counter: null, label: 'Materiais salvos no Studio' },
};

const STAFF = ['SUPERADMIN', 'ADMIN', 'MODERADOR'];
export const currentPeriod = () => new Date().toISOString().slice(0, 7);
const activeWhere = () => ({ status: 'ATIVA', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] });

export const currentSubscription = (userId) =>
  prisma.subscription.findFirst({ where: { userId, ...activeWhere() }, include: { plan: true }, orderBy: { startedAt: 'desc' } });

export async function getEntitlements(user) {
  if (STAFF.includes(user.role)) return { staff: true, plan: null, subscription: null, limits: {} };
  const subscription = await currentSubscription(user.id);
  let plan = subscription?.plan?.active ? subscription.plan : null;
  if (!plan) plan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
  return { staff: false, plan, subscription, limits: plan?.limits ?? {} };
}

const limitReached = (label, limit, used, plan) =>
  new AppError(403, `Você atingiu o limite do seu plano (${plan?.name ?? 'FREE'}): ${label.toLowerCase()} — ${limit}. Veja os planos disponíveis.`, 'LIMIT_REACHED', { limite: limit, usado: used, plano: plan?.code ?? 'FREE' });

// Consome 1 unidade do contador mensal de forma ATÔMICA: o UPDATE só ocorre enquanto count < limite.
export async function consume(user, limitKey) {
  const def = LIMIT_KEYS[limitKey];
  const { limits, plan, staff } = await getEntitlements(user);
  const limit = staff ? null : limits[limitKey];
  const period = currentPeriod();
  if (limit == null) {
    await prisma.usageCounter.upsert({
      where: { userId_key_period: { userId: user.id, key: def.counter, period } },
      update: { count: { increment: 1 } }, create: { userId: user.id, key: def.counter, period, count: 1 },
    });
    return;
  }
  if (limit <= 0) throw limitReached(def.label, limit, 0, plan);
  const rows = await prisma.$queryRaw`
    INSERT INTO "UsageCounter" ("id", "userId", "key", "period", "count")
    VALUES (${crypto.randomUUID()}, ${user.id}, ${def.counter}, ${period}, 1)
    ON CONFLICT ("userId", "key", "period") DO UPDATE SET "count" = "UsageCounter"."count" + 1
    WHERE "UsageCounter"."count" < ${limit}
    RETURNING "count"`;
  if (!rows.length) throw limitReached(def.label, limit, limit, plan);
}

export async function assertAssetCapacity(user) {
  const { limits, plan, staff } = await getEntitlements(user);
  const limit = staff ? null : limits.studioAssets;
  if (limit == null) return;
  const used = await prisma.marketingAsset.count({ where: { userId: user.id } });
  if (used >= limit) throw limitReached(LIMIT_KEYS.studioAssets.label, limit, used, plan);
}

export async function usageSummary(user) {
  const { limits, staff } = await getEntitlements(user);
  const period = currentPeriod();
  const counters = await prisma.usageCounter.findMany({ where: { userId: user.id, period } });
  const assets = await prisma.marketingAsset.count({ where: { userId: user.id } });
  return Object.entries(LIMIT_KEYS).map(([key, def]) => ({
    key, label: def.label, period: def.counter ? period : null,
    used: def.counter ? (counters.find((c) => c.key === def.counter)?.count ?? 0) : assets,
    limit: staff ? null : (limits[key] ?? null),
  }));
}
