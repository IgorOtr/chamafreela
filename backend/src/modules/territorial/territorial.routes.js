import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './territorial.service.js';

const router = Router();
router.use(authenticate);

const catQuery = z.object({ category: z.string().trim().max(100).optional() });
const syncLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, skip: () => env.NODE_ENV === 'test', message: { erro: { codigo: 'RATE_LIMIT', mensagem: 'Muitas sincronizações. Tente mais tarde.' } } });
const syncBody = z.object({ codes: z.array(z.string().regex(/^\d{7}$/, 'Código IBGE inválido')).max(10).optional() });

router.get('/municipalities', asyncHandler(async (_req, res) => res.json(await service.listMunicipalities())));
router.get('/overview', validate(catQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.overview(req.query))));
router.get('/municipalities/:code', validate(catQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.detail(req.params.code, req.query))));
router.post('/admin/sync', requirePermission('territorial:manage'), syncLimiter, validate(syncBody),
  asyncHandler(async (req, res) => res.json(await service.sync(req.user, req.body.codes, req.ip))));

export default router;
