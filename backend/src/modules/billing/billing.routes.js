import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getGateway, readiness } from '../../integrations/payments/gateway.js';
import { unauthorized } from '../../utils/errors.js';
import { handleWebhook } from './webhook.service.js';

const router = Router();

// Webhook do Asaas: público, autenticado pelo token compartilhado (cabeçalho `asaas-access-token`).
router.post('/webhook/asaas', asyncHandler(async (req, res) => {
  if (!getGateway().verifyWebhook(req.headers)) throw unauthorized('Token do webhook inválido');
  res.json(await handleWebhook(req.body));
}));

// Prontidão e teste de conexão (administração).
router.get('/status', authenticate, requirePermission('plans:manage'), (_req, res) => res.json(readiness()));
router.post('/test-connection', authenticate, requirePermission('plans:manage'), asyncHandler(async (_req, res) => {
  await getGateway().ping();
  res.json({ ok: true });
}));

export default router;
