import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './plans.service.js';

const router = Router();

// Público: planos ativos para a home e a página de planos.
router.get('/', asyncHandler(async (_req, res) => {
  const { billingEnabled, plans } = await service.listPublic();
  res.set('Cache-Control', 'public, max-age=60');
  res.json(plans.map((p) => ({ ...p, billingEnabled })));
}));

const limit = z.number().int().min(0).max(1_000_000).nullable();
const patchSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  tagline: z.string().trim().min(2).max(120).optional(),
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  promoPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  promoMonths: z.number().int().min(1).max(36).nullable().optional(),
  promoNote: z.string().trim().max(300).nullable().optional(),
  features: z.array(z.string().trim().min(2).max(140)).min(1).max(12).optional(),
  limits: z.object({ simulationsPerMonth: limit.optional(), studioGenerationsPerMonth: limit.optional(), studioAssets: limit.optional() }).optional(),
  available: z.boolean().optional(),
  highlighted: z.boolean().optional(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).max(100).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nada para atualizar');

router.get('/admin', authenticate, requirePermission('plans:manage'), asyncHandler(async (_req, res) => res.json(await service.listAdmin())));
router.patch('/admin/:code', authenticate, requirePermission('plans:manage'), validate(patchSchema),
  asyncHandler(async (req, res) => res.json(await service.update(req.user, req.params.code, req.body, req.ip))));

export default router;
