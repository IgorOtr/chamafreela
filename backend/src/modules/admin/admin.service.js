import { prisma } from '../../database/prisma.js';

export async function dashboard() {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [totalUsers, byRole, pending, recent, categories] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.count({ where: { status: 'PENDENTE' } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.category.count({ where: { active: true } }),
  ]);
  const perDay = {};
  for (const { createdAt } of recent) {
    const day = createdAt.toISOString().slice(0, 10);
    perDay[day] = (perDay[day] ?? 0) + 1;
  }
  return {
    totalUsers,
    usersByRole: Object.fromEntries(byRole.map((r) => [r.role, r._count._all])),
    pendingUsers: pending,
    activeCategories: categories,
    signupsLast30Days: Object.entries(perDay).sort().map(([date, count]) => ({ date, count })),
    // Profissionais pendentes, oportunidades e assinaturas entram nas Fases 2, 3 e 9.
  };
}
