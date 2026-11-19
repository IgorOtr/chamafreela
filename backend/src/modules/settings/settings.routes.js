import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './settings.service.js';

const router = Router();

// Público: estado do agendamento do CHAMALÁ Formaliza.
router.get('/formaliza', asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await service.getFormalizaPublic());
}));

const bookingUrl = z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), 'Informe um link começando com https://');
const formalizaSchema = z.object({ enabled: z.boolean(), bookingUrl })
  .refine((v) => !v.enabled || v.bookingUrl !== '', { message: 'Informe o link de agendamento para ativar', path: ['bookingUrl'] });

// Apenas o superadministrador ('*'): nenhum outro papel possui settings:manage.
router.get('/formaliza/admin', authenticate, requirePermission('settings:manage'), asyncHandler(async (_req, res) => res.json(await service.getFormaliza())));
router.put('/formaliza/admin', authenticate, requirePermission('settings:manage'), validate(formalizaSchema),
  asyncHandler(async (req, res) => res.json(await service.updateFormaliza(req.user, req.body, req.ip))));

export default router;
