import { Router } from 'express';
import { z } from 'zod';
import { ROLES } from '../../config/permissions.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './users.service.js';

const router = Router();
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(ROLES).optional(),
  status: z.enum(['ATIVO', 'PENDENTE', 'SUSPENSO']).optional(),
  q: z.string().trim().max(100).optional(),
});
const updateBody = z.object({ role: z.enum(ROLES).optional(), status: z.enum(['ATIVO', 'PENDENTE', 'SUSPENSO']).optional() })
  .refine((v) => v.role || v.status, 'Informe papel ou status');

router.use(authenticate);
router.get('/', requirePermission('users:read'), validate(listQuery, 'query'),
  asyncHandler(async (req, res) => res.json(await service.list(req.query))));
router.patch('/:id', requirePermission('users:update'), validate(updateBody),
  asyncHandler(async (req, res) => res.json(await service.update(req.user, req.params.id, req.body, req.ip))));

export default router;
