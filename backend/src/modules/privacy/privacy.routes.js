import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './privacy.service.js';

const router = Router();
router.use(authenticate);

router.get('/export', asyncHandler(async (req, res) => {
  const data = await service.exportData(req.user, req.ip);
  res.set('Content-Disposition', 'attachment; filename="chamalafree-meus-dados.json"');
  res.set('Cache-Control', 'no-store');
  res.type('application/json').send(JSON.stringify(data, null, 2));
}));

export default router;
