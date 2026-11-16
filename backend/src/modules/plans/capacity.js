import { prisma } from '../../database/prisma.js';
import { AppError } from '../../utils/errors.js';

// Capacidade do plano FREE: limite global de contas gratuitas. Controlado pelo superadministrador (Plan.maxUsers do FREE).
// "Conta FREE" = conta de usuário (profissional, empresa ou cliente) não suspensa e sem assinatura paga ativa.
export const NON_STAFF_ROLES = ['PROFISSIONAL', 'EMPRESA', 'CLIENTE'];
export const FREE_CAPACITY_LOCK = 7731001; // chave do advisory lock que serializa novos cadastros

const freeUsersWhere = () => ({
  role: { in: NON_STAFF_ROLES },
  status: { not: 'SUSPENSO' },
  subscriptions: { none: { status: 'ATIVA', planCode: { not: 'FREE' }, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] } },
});

export const countFreeUsers = (db = prisma) => db.user.count({ where: freeUsersWhere() });

export async function getFreeCapacity(db = prisma) {
  const plan = await db.plan.findUnique({ where: { code: 'FREE' }, select: { maxUsers: true } });
  const max = plan?.maxUsers ?? null;
  const used = await countFreeUsers(db);
  return { max, used, limited: max !== null, open: max === null || used < max, remaining: max === null ? null : Math.max(0, max - used) };
}

export async function assertFreeCapacity(db = prisma) {
  const c = await getFreeCapacity(db);
  if (!c.open) {
    throw new AppError(403, 'As vagas gratuitas estão temporariamente esgotadas. Novos cadastros serão liberados em breve.', 'FREE_CAPACITY_REACHED');
  }
  return c;
}
