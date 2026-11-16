import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// Público: planos ativos para a home e a página de planos.
router.get('/', asyncHandler(async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { position: 'asc' } });
  res.set('Cache-Control', 'public, max-age=300');
  res.json(plans.map((p) => ({
    code: p.code, name: p.name, tagline: p.tagline, priceCents: p.priceCents, promoPriceCents: p.promoPriceCents, promoMonths: p.promoMonths,
    promoNote: p.promoNote, features: p.features, available: p.available, highlighted: p.highlighted,
  })));
}));

export default router;
