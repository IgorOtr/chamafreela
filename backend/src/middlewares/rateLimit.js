import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

// Desligado em testes, exceto quando RATE_LIMIT_TEST=true (para testar o próprio limitador).
const skip = () => env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== 'true';
const msg = { erro: { codigo: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Tente novamente em instantes.' } };

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: msg, skip });
export const globalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, message: msg, skip });

// Por e-mail: dificulta ataque distribuído (muitos IPs) contra uma única conta.
export const loginEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: msg, skip,
  keyGenerator: (req) => `login:${String(req.body?.email ?? '').trim().toLowerCase().slice(0, 200)}`,
  validate: { keyGeneratorIpFallback: false },
});
