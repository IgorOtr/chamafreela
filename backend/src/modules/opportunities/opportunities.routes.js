import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate, optionalAuthenticate, requirePermission, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './opportunities.service.js';
import { adminListQuery, catalogQuery, interestSchema, opportunitySchema, reviewSchema } from './opportunities.validators.js';

const router = Router();
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 15, standardHeaders: true, legacyHeaders: false, skip: () => env.NODE_ENV === 'test',
  message: { erro: { codigo: 'RATE_LIMIT', mensagem: 'Muitas publicações em pouco tempo. Tente novamente mais tarde.' } },
});

// Público
router.get('/', validate(catalogQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.catalog(req.query))));
router.get('/cities', asyncHandler(async (_req, res) => res.json(await service.cities())));

// Empresa
router.get('/mine', authenticate, requireRole('EMPRESA'), asyncHandler(async (req, res) => res.json(await service.mine(req.user))));
router.post('/', authenticate, requireRole('EMPRESA'), createLimiter, validate(opportunitySchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user, req.body, req.ip))));
router.put('/:id', authenticate, requireRole('EMPRESA'), validate(opportunitySchema),
  asyncHandler(async (req, res) => res.json(await service.update(req.user, req.params.id, req.body, req.ip))));
router.post('/:id/close', authenticate, requireRole('EMPRESA'), asyncHandler(async (req, res) => res.json(await service.close(req.user, req.params.id, req.ip))));
router.get('/:id/interests', authenticate, requireRole('EMPRESA'), asyncHandler(async (req, res) => res.json(await service.interestsOf(req.user, req.params.id))));

// Profissional
router.get('/interests/mine', authenticate, requireRole('PROFISSIONAL'), asyncHandler(async (req, res) => res.json(await service.myInterests(req.user))));
router.post('/:id/interest', authenticate, requireRole('PROFISSIONAL'), validate(interestSchema),
  asyncHandler(async (req, res) => res.status(201).json(await service.expressInterest(req.user, req.params.id, req.body))));
router.delete('/:id/interest', authenticate, requireRole('PROFISSIONAL'), asyncHandler(async (req, res) => { await service.withdrawInterest(req.user, req.params.id); res.status(204).end(); }));

// Administração
router.get('/admin/list', authenticate, requirePermission('opportunities:moderate'), validate(adminListQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.adminList(req.query))));
router.post('/admin/:id/review', authenticate, requirePermission('opportunities:moderate'), validate(reviewSchema),
  asyncHandler(async (req, res) => res.json(await service.review(req.user, req.params.id, req.body, req.ip))));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req, res) => res.json(await service.detail(req.params.id, req.user))));

export default router;
