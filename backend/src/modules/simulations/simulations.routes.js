import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './simulations.service.js';
import { createSchema, listQuery } from './simulations.validators.js';

const router = Router();
router.use(authenticate);

const runLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, skip: () => env.NODE_ENV === 'test', message: { erro: { codigo: 'RATE_LIMIT', mensagem: 'Muitas simulações em pouco tempo. Tente mais tarde.' } } });

router.get('/defaults', (_req, res) => res.json(service.defaults()));
router.get('/', validate(listQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.list(req.user, req.query))));
router.post('/', runLimiter, validate(createSchema), asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user, req.body))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.get(req.user, req.params.id))));
router.delete('/:id', asyncHandler(async (req, res) => { await service.remove(req.user, req.params.id); res.status(204).end(); }));

export default router;
