import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/errors.js';
import * as service from './companies.service.js';
import { companyAdminQuery, companySchema, companyStatusSchema } from './companies.validators.js';

const router = Router();
router.use(authenticate);

router.get('/me', requireRole('EMPRESA'), asyncHandler(async (req, res) => {
  const c = await service.getOwn(req.user.id);
  if (!c) throw notFound('Perfil empresarial ainda não criado');
  res.json(c);
}));
router.put('/me', requireRole('EMPRESA'), validate(companySchema),
  asyncHandler(async (req, res) => res.json(await service.saveOwn(req.user, req.body, req.ip))));

router.get('/admin/list', requirePermission('companies:manage'), validate(companyAdminQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.adminList(req.query))));
router.patch('/admin/:id', requirePermission('companies:manage'), validate(companyStatusSchema),
  asyncHandler(async (req, res) => res.json(await service.setStatus(req.user, req.params.id, req.body.status, req.ip))));

export default router;
