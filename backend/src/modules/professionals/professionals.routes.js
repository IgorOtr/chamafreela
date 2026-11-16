import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/errors.js';
import * as service from './professionals.service.js';
import { adminEditSchema, adminListQuery, catalogQuery, profileSchema, reviewSchema } from './professionals.validators.js';

const router = Router();

// Público
router.get('/', validate(catalogQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.catalog(req.query))));
router.get('/cities', asyncHandler(async (_req, res) => res.json(await service.cities())));

// Profissional (próprio perfil)
router.get('/me', authenticate, requireRole('PROFISSIONAL'), asyncHandler(async (req, res) => {
  const p = await service.getOwn(req.user.id);
  if (!p) throw notFound('Perfil ainda não criado');
  res.json(p);
}));
router.put('/me', authenticate, requireRole('PROFISSIONAL'), validate(profileSchema),
  asyncHandler(async (req, res) => res.json(await service.saveOwn(req.user, req.body, req.ip))));

// Administração
router.get('/admin/list', authenticate, requirePermission('professionals:moderate'), validate(adminListQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.adminList(req.query))));
router.post('/admin/:id/review', authenticate, requirePermission('professionals:moderate'), validate(reviewSchema),
  asyncHandler(async (req, res) => res.json(await service.review(req.user, req.params.id, req.body, req.ip))));
router.patch('/admin/:id', authenticate, requirePermission('professionals:manage'), validate(adminEditSchema),
  asyncHandler(async (req, res) => res.json(await service.adminEdit(req.user, req.params.id, req.body, req.ip))));

// Perfil público por slug (por último, para não colidir com as rotas acima)
router.get('/:slug', asyncHandler(async (req, res) => res.json(await service.publicProfile(req.params.slug))));

export default router;
