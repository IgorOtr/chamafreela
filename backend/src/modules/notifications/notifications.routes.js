import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './notifications.service.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => res.json(await service.list(req.user.id))));
router.post('/read-all', asyncHandler(async (req, res) => { await service.markAllRead(req.user.id); res.status(204).end(); }));
router.post('/:id/read', asyncHandler(async (req, res) => { await service.markRead(req.user.id, req.params.id); res.status(204).end(); }));
router.get('/preferences', asyncHandler(async (req, res) => res.json(await service.preferences(req.user.id))));
router.put('/preferences', validate(z.object({ notifyRecommendations: z.boolean() })),
  asyncHandler(async (req, res) => res.json(await service.setPreferences(req.user.id, req.body.notifyRecommendations))));

export default router;
