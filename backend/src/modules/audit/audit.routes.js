import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './audit.service.js';

const router = Router();
const query = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  entity: z.string().optional(),
  entityId: z.string().optional(),
});

router.get('/', authenticate, requirePermission('audit:read'), validate(query, 'query'),
  asyncHandler(async (req, res) => res.json(await service.list(req.query))));

export default router;
