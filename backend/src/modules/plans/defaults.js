// Planos iniciais (CLAUDE.md §13). Valores e condições são administráveis: este arquivo só alimenta o seed.
// `limits` vazio = ilimitado: os limites de uso por plano serão definidos pelo contratante (painel de planos).
// Cobrança real NÃO está ativada: planos pagos ficam com available=false até aprovação comercial e integração do gateway.
export const DEFAULT_PLANS = [
  {
    code: 'FREE', name: 'FREE', tagline: 'Para começar a ser encontrado', priceCents: 0, limits: {}, available: true, highlighted: false, position: 1,
    features: ['Perfil público básico', 'Divulgação dos seus serviços', 'Contato direto com clientes', 'Participação no catálogo de profissionais'],
  },
  {
    code: 'PRO', name: 'PRO', tagline: 'Para se destacar', priceCents: 1490, promoPriceCents: 999, promoMonths: 3,
    promoNote: 'Oferta de lançamento nos três primeiros meses, conforme condições comerciais a serem aprovadas.',
    limits: {}, available: false, highlighted: true, position: 2,
    features: ['Tudo do plano FREE', 'Destaques promocionais', 'Recursos complementares de divulgação', 'Benefícios adicionais definidos pela administração'],
  },
];

export async function seedPlans(prisma) {
  for (const p of DEFAULT_PLANS) {
    await prisma.plan.upsert({ where: { code: p.code }, update: {}, create: p });
  }
}
