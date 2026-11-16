import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { can } from '../config/permissions.js';
import { prisma } from '../database/prisma.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw unauthorized('Token inválido ou expirado');
  }
  // Revalida no banco: papel/status podem ter mudado desde a emissão do token.
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status === 'SUSPENSO') throw unauthorized('Conta indisponível');
  req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
  next();
});

export const requirePermission = (permission) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!can(req.user.role, permission)) return next(forbidden());
  next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

// Identifica o usuário quando há token válido, sem exigir login (rotas públicas com visão enriquecida).
export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && user.status !== 'SUSPENSO') req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
  } catch { /* token inválido: segue como visitante */ }
  next();
});
