import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const skip = () => env.NODE_ENV === 'test';
const msg = { erro: { codigo: 'RATE_LIMIT', mensagem: 'Muitas tentativas. Tente novamente em instantes.' } };

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: msg, skip });
export const globalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, message: msg, skip });
