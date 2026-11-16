import { Router } from 'express';
import { z } from 'zod';
import { CRITERIA } from './matching.js';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './recommendations.service.js';

const router = Router();
router.use(authenticate);

router.get('/mine', requireRole('PROFISSIONAL'), asyncHandler(async (req, res) => res.json(await service.listMine(req.user))));
router.post('/:id/dismiss', requireRole('PROFISSIONAL'), asyncHandler(async (req, res) => { await service.dismiss(req.user, req.params.id); res.status(204).end(); }));

// Configuração dos pesos (administração)
router.get('/config', requirePermission('admin:dashboard'), asyncHandler(async (_req, res) => res.json({ ...(await service.getConfig()), criteria: CRITERIA })));
const configBody = z.object({
  weights: z.record(z.string(), z.number()),
  minScore: z.number().int().min(0).max(100),
});
router.put('/config', requirePermission('match:configure'), validate(configBody),
  asyncHandler(async (req, res) => res.json(await service.setConfig(req.user, req.body, req.ip))));

router.get('/admin/opportunity/:id', requirePermission('opportunities:moderate'),
  asyncHandler(async (req, res) => res.json(await service.matchesForOpportunity(req.params.id))));

export default router;
