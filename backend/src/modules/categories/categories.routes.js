import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './categories.service.js';

const router = Router();
const createBody = z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional() });
const updateBody = createBody.partial().extend({ active: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar');

router.get('/', asyncHandler(async (_req, res) => res.json(await service.listPublic())));
router.get('/all', authenticate, requirePermission('categories:manage'),
  asyncHandler(async (_req, res) => res.json(await service.listAll())));
router.post('/', authenticate, requirePermission('categories:manage'), validate(createBody),
  asyncHandler(async (req, res) => res.status(201).json(await service.create(req.user, req.body, req.ip))));
router.patch('/:id', authenticate, requirePermission('categories:manage'), validate(updateBody),
  asyncHandler(async (req, res) => res.json(await service.update(req.user, req.params.id, req.body, req.ip))));

export default router;
