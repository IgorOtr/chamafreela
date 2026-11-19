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

// Aceita "+55 24 99946-8823" e guarda só os dígitos (formato do wa.me, com DDI).
const whatsapp = z.string().trim().max(30).transform((v) => v.replace(/\D/g, '')).refine((v) => /^\d{12,13}$/.test(v), 'Informe o WhatsApp com DDI e DDD, ex.: +55 24 99999-9999');
const formalizaSchema = z.object({ enabled: z.boolean(), whatsapp, message: z.string().trim().min(10, 'Escreva uma mensagem com pelo menos 10 caracteres').max(800) });

// Apenas o superadministrador ('*'): nenhum outro papel possui settings:manage.
router.get('/formaliza/admin', authenticate, requirePermission('settings:manage'), asyncHandler(async (_req, res) => res.json(await service.getFormaliza())));
router.put('/formaliza/admin', authenticate, requirePermission('settings:manage'), validate(formalizaSchema),
  asyncHandler(async (req, res) => res.json(await service.updateFormaliza(req.user, req.body, req.ip))));

export default router;
