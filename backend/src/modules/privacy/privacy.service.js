import { prisma } from '../../database/prisma.js';
import * as audit from '../audit/audit.service.js';

// Portabilidade/acesso (LGPD art. 18): todos os dados do PRÓPRIO titular, sem credenciais nem dados de terceiros.
export async function exportData(user, ip) {
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true, consentAt: true, notifyRecommendations: true },
  });
  const [professional, company, simulations, brandKit, marketingAssets, dataRequests, notifications] = await Promise.all([
    prisma.professional.findUnique({ where: { userId: user.id }, include: { services: true, areas: true, portfolio: true, category: { select: { name: true } } } }),
    prisma.company.findUnique({ where: { userId: user.id } }),
    prisma.simulation.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.brandKit.findUnique({ where: { userId: user.id } }),
    prisma.marketingAsset.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.dataRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 500 }),
  ]);
  const [opportunities, interests, recommendations] = await Promise.all([
    company ? prisma.opportunity.findMany({ where: { companyId: company.id }, include: { category: { select: { name: true } }, _count: { select: { interests: true } } }, orderBy: { createdAt: 'desc' } }) : [],
    professional ? prisma.interest.findMany({ where: { professionalId: professional.id }, include: { opportunity: { select: { title: true, company: { select: { tradeName: true } } } } } }) : [],
    professional ? prisma.recommendation.findMany({ where: { professionalId: professional.id }, include: { opportunity: { select: { title: true } } } }) : [],
  ]);

  await audit.record({ actorId: user.id, action: 'DATA_EXPORT', entity: 'User', entityId: user.id, ip });
  return {
    geradoEm: new Date().toISOString(),
    aviso: 'Este arquivo contém os seus dados pessoais armazenados no CHAMALÁFREE. Guarde-o com cuidado.',
    conta: u, perfilProfissional: professional, empresa: company, oportunidadesPublicadasPorMim: opportunities,
    manifestacoesDeInteresse: interests, recomendacoesRecebidas: recommendations, simulacoes: simulations, kitDeMarca: brandKit,
    materiaisDeMarketing: marketingAssets, solicitacoesLgpd: dataRequests, notificacoes: notifications,
  };
}
