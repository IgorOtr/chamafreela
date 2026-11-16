import { prisma } from '../../database/prisma.js';
import { currentPeriod } from '../billing/entitlements.js';

const ROLES = ['PROFISSIONAL', 'EMPRESA', 'CLIENTE'];
const monthKey = (d) => d.toISOString().slice(0, 7);

function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  return out;
}

export async function overview({ months }) {
  const keys = lastMonths(months);
  const since = new Date(`${keys[0]}-01T00:00:00Z`);
  const d30 = new Date(Date.now() - 30 * 86400_000);
  const period = currentPeriod();

  const [signupRows, nonStaff, subs, paymentAgg, profByStatus, oppByStatus, interests, opportunities] = await Promise.all([
    prisma.$queryRaw`SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, "role"::text AS role, count(*)::int AS n FROM "User" WHERE "createdAt" >= ${since} GROUP BY 1, 2`,
    prisma.user.count({ where: { role: { in: ROLES } } }),
    prisma.subscription.groupBy({ by: ['planCode', 'status'], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amountCents: true } }),
    prisma.professional.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.opportunity.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.interest.count(),
    prisma.opportunity.count(),
  ]);

  const signups = keys.map((m) => {
    const row = { month: m, total: 0 };
    for (const r of ROLES) { row[r] = signupRows.find((x) => x.month === m && x.role === r)?.n ?? 0; row.total += row[r]; }
    return row;
  });

  const [simulations, assets, recommendations, interestsNew, opportunitiesNew, professionalsNew, notifications, studioGen] = await Promise.all([
    prisma.simulation.count({ where: { createdAt: { gte: d30 } } }),
    prisma.marketingAsset.count({ where: { createdAt: { gte: d30 } } }),
    prisma.recommendation.count({ where: { createdAt: { gte: d30 } } }),
    prisma.interest.count({ where: { createdAt: { gte: d30 } } }),
    prisma.opportunity.count({ where: { createdAt: { gte: d30 } } }),
    prisma.professional.count({ where: { createdAt: { gte: d30 } } }),
    prisma.notification.count({ where: { createdAt: { gte: d30 } } }),
    prisma.usageCounter.aggregate({ where: { key: 'studioGenerations', period }, _sum: { count: true } }),
  ]);
  const modules = [
    { key: 'professionals', label: 'Perfis profissionais criados', module: 'Marketplace', value: professionalsNew },
    { key: 'opportunities', label: 'Oportunidades solicitadas', module: 'Empresas e oportunidades', value: opportunitiesNew },
    { key: 'interests', label: 'Manifestações de interesse', module: 'Empresas e oportunidades', value: interestsNew },
    { key: 'recommendations', label: 'Recomendações geradas', module: 'CHAMALÁ Conecta', value: recommendations },
    { key: 'notifications', label: 'Notificações geradas', module: 'CHAMALÁ Conecta', value: notifications },
    { key: 'simulations', label: 'Simulações executadas', module: 'CHAMALÁ Insights', value: simulations },
    { key: 'studioAssets', label: 'Materiais salvos', module: 'CHAMALÁ Studio', value: assets },
    { key: 'studioGenerations', label: `Gerações de texto/calendário (${period})`, module: 'CHAMALÁ Studio', value: studioGen._sum.count ?? 0 },
  ];

  const activePaid = subs.filter((s) => s.status === 'ATIVA' && s.planCode !== 'FREE').reduce((n, s) => n + s._count._all, 0);
  const subscriptions = {
    byPlanStatus: subs.map((s) => ({ planCode: s.planCode, status: s.status, count: s._count._all })),
    activePaid, freeUsers: Math.max(0, nonStaff - activePaid), nonStaffUsers: nonStaff,
    payments: { count: paymentAgg.reduce((n, p) => n + p._count._all, 0), paidCents: paymentAgg.find((p) => p.status === 'PAGO')?._sum.amountCents ?? 0 },
  };

  return {
    generatedAt: new Date().toISOString(), months, signups, modules, subscriptions,
    funnel: {
      professionalsByStatus: Object.fromEntries(profByStatus.map((r) => [r.status, r._count._all])),
      opportunitiesByStatus: Object.fromEntries(oppByStatus.map((r) => [r.status, r._count._all])),
      interestsPerOpportunity: opportunities ? Math.round((interests / opportunities) * 100) / 100 : null,
    },
  };
}

export const events = ({ limit }) => prisma.systemEvent.findMany({ orderBy: { createdAt: 'desc' }, take: limit });

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function toCsv(rows) { return '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\n') + '\n'; }

export async function exportDataset(dataset, months = 12) {
  const o = await overview({ months });
  if (dataset === 'signups') return { filename: 'cadastros-por-mes.csv', rows: [['Mês', ...ROLES, 'Total'], ...o.signups.map((s) => [s.month, ...ROLES.map((r) => s[r]), s.total])] };
  if (dataset === 'modules') return { filename: 'utilizacao-dos-modulos.csv', rows: [['Módulo', 'Indicador', 'Valor (últimos 30 dias)'], ...o.modules.map((m) => [m.module, m.label, m.value])] };
  return { filename: 'assinaturas.csv', rows: [['Plano', 'Situação', 'Quantidade'], ...o.subscriptions.byPlanStatus.map((s) => [s.planCode, s.status, s.count])] };
}
