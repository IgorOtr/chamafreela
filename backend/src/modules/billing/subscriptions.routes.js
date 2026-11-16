import { Router } from 'express';
import { z } from 'zod';
import { BILLING_TYPES } from '../../integrations/payments/asaas.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './subscriptions.service.js';

const router = Router();
router.use(authenticate);

router.get('/me', asyncHandler(async (req, res) => res.json(await service.me(req.user))));
router.post('/me/change', validate(z.object({ planCode: z.string().trim().min(2).max(20), cpfCnpj: z.string().trim().max(20).optional(), billingType: z.enum(BILLING_TYPES).optional() })),
  asyncHandler(async (req, res) => res.json(await service.change(req.user, req.body.planCode, req.ip, req.body))));
router.get('/me/pending-link', asyncHandler(async (req, res) => res.json(await service.pendingLink(req.user))));
router.post('/me/cancel', asyncHandler(async (req, res) => { await service.cancel(req.user, req.ip); res.status(204).end(); }));

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ATIVA', 'CANCELADA', 'EXPIRADA']).optional(), planCode: z.string().trim().max(20).optional(), q: z.string().trim().max(100).optional(),
});
const grantBody = z.object({
  userId: z.string().uuid(), planCode: z.string().trim().min(2).max(20),
  endsAt: z.coerce.date().optional(), note: z.string().trim().max(300).optional(),
});

router.get('/admin', requirePermission('subscriptions:manage'), validate(listQuery, 'query'), asyncHandler(async (req, res) => res.json(await service.adminList(req.query))));
router.post('/admin/grant', requirePermission('subscriptions:manage'), validate(grantBody),
  asyncHandler(async (req, res) => res.status(201).json(await service.grant(req.user, req.body, req.ip) ?? { plano: 'FREE' })));
router.post('/admin/:id/cancel', requirePermission('subscriptions:manage'), asyncHandler(async (req, res) => { await service.adminCancel(req.user, req.params.id, req.ip); res.status(204).end(); }));

export default router;
