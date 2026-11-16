import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';

// Solicitações LGPD de atualização/exclusão de dados.
const router = Router();
router.use(authenticate);

const createBody = z.object({ type: z.enum(['ATUALIZACAO', 'EXCLUSAO']), message: z.string().trim().max(1000).optional() });

router.post('/', validate(createBody), asyncHandler(async (req, res) => {
  const open = await prisma.dataRequest.findFirst({ where: { userId: req.user.id, type: req.body.type, status: 'ABERTA' } });
  if (open) return res.status(200).json(open);
  const created = await prisma.dataRequest.create({ data: { ...req.body, userId: req.user.id } });
  await audit.record({ actorId: req.user.id, action: 'DATA_REQUEST_CREATE', entity: 'DataRequest', entityId: created.id, changes: { type: created.type }, ip: req.ip });
  res.status(201).json(created);
}));

router.get('/mine', asyncHandler(async (req, res) =>
  res.json(await prisma.dataRequest.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }))));

router.get('/', requirePermission('datarequests:manage'), asyncHandler(async (_req, res) =>
  res.json(await prisma.dataRequest.findMany({ orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 100, include: { user: { select: { id: true, name: true, email: true } } } }))));

router.post('/:id/resolve', requirePermission('datarequests:manage'), asyncHandler(async (req, res) => {
  const r = await prisma.dataRequest.findUnique({ where: { id: req.params.id } });
  if (!r) throw notFound();
  const updated = await prisma.dataRequest.update({ where: { id: r.id }, data: { status: 'CONCLUIDA', resolvedAt: new Date() } });
  await audit.record({ actorId: req.user.id, action: 'DATA_REQUEST_RESOLVE', entity: 'DataRequest', entityId: r.id, ip: req.ip });
  res.json(updated);
}));

export default router;
