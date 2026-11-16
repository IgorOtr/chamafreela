import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './admin.service.js';

const router = Router();
router.get('/dashboard', authenticate, requirePermission('admin:dashboard'),
  asyncHandler(async (_req, res) => res.json(await service.dashboard())));
export default router;
