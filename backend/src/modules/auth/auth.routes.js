import { Router } from 'express';
import { env } from '../../config/env.js';
import { authenticate } from '../../middlewares/auth.js';
import { authLimiter, loginEmailLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forbidden } from '../../utils/errors.js';
import { loginSchema, registerSchema } from './auth.validators.js';
import * as service from './auth.service.js';

const router = Router();
const COOKIE = 'refresh_token';
const cookieOpts = (expires) => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: '/api/auth',
  expires,
});

function send(res, status, { accessToken, refresh, user }) {
  res.cookie(COOKIE, refresh.token, cookieOpts(refresh.expiresAt));
  res.status(status).json({ accessToken, user });
}

// Defesa extra de CSRF nos endpoints baseados em cookie.
function checkOrigin(req, _res, next) {
  const origin = req.headers.origin;
  if (origin && origin !== env.CORS_ORIGIN) return next(forbidden('Origem não permitida'));
  next();
}

router.post('/register', authLimiter, validate(registerSchema),
  asyncHandler(async (req, res) => send(res, 201, await service.register(req.body))));

router.post('/login', authLimiter, validate(loginSchema), loginEmailLimiter,
  asyncHandler(async (req, res) => send(res, 200, await service.login(req.body))));

router.post('/refresh', authLimiter, checkOrigin,
  asyncHandler(async (req, res) => send(res, 200, await service.refresh(req.cookies[COOKIE]))));

router.post('/logout', checkOrigin, asyncHandler(async (req, res) => {
  await service.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, cookieOpts());
  res.status(204).end();
}));

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

export default router;
