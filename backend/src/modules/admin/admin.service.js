import { prisma } from '../../database/prisma.js';

export async function dashboard() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [totalUsers, byRole, pending, recent, categories, profByStatus, openRequests, usedCategories, oppByStatus, companies, activeSubs, nonStaff] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { status: 'PENDENTE' } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.category.count({ where: { active: true } }),
    prisma.professional.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.dataRequest.count({ where: { status: 'ABERTA' } }),
    prisma.professional.groupBy({ by: ['categoryId'], where: { status: 'APROVADO' }, _count: { _all: true }, orderBy: { _count: { categoryId: 'desc' } }, take: 5 }),
    prisma.opportunity.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.company.count(),
    prisma.subscription.groupBy({ by: ['planCode'], where: { status: 'ATIVA', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, _count: { _all: true } }),
    prisma.user.count({ where: { role: { in: ['PROFISSIONAL', 'EMPRESA', 'CLIENTE'] } } }),
  ]);
  const names = await prisma.category.findMany({ where: { id: { in: usedCategories.map((c) => c.categoryId) } }, select: { id: true, name: true } });
  const perDay = {};
  for (const { createdAt } of recent) {
    const day = createdAt.toISOString().slice(0, 10);
    perDay[day] = (perDay[day] ?? 0) + 1;
  }
  return {
    totalUsers,
    usersByRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
    pendingUsers: pending,
    professionalsByStatus: Object.fromEntries(profByStatus.map((r) => [r.status, r._count._all])),
    openDataRequests: openRequests,
    opportunitiesByStatus: Object.fromEntries(oppByStatus.map((r) => [r.status, r._count._all])),
    totalCompanies: companies,
    subscriptions: { activePaid: activeSubs.filter((a) => a.planCode !== 'FREE').reduce((n, a) => n + a._count._all, 0), byPlan: Object.fromEntries(activeSubs.map((a) => [a.planCode, a._count._all])), nonStaffUsers: nonStaff },
    topCategories: usedCategories.map((c) => ({ name: names.find((n) => n.id === c.categoryId)?.name, count: c._count._all })),
    activeCategories: categories,
    signupsLast30Days: Object.entries(perDay).sort().map(([date, count]) => ({ date, count })),
  };
}
