import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { conflict, unauthorized } from '../../utils/errors.js';
import { FREE_CAPACITY_LOCK, assertFreeCapacity } from '../plans/capacity.js';

const BCRYPT_COST = env.NODE_ENV === 'test' ? 4 : 12;
const REUSE_GRACE_MS = 10_000;
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status });

export const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.JWT_ACCESS_EXPIRES_IN });

async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400_000);
  await prisma.refreshToken.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  return { token, expiresAt };
}

async function session(user) {
  const refresh = await issueRefreshToken(user.id);
  return { accessToken: signAccessToken(user), refresh, user: publicUser(user) };
}

export async function register({ name, email, password, role }) {
  if (await prisma.user.findUnique({ where: { email } })) throw conflict('E-mail já cadastrado');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  let user;
  try {
    // A verificação do limite de contas FREE e a criação ficam sob um lock: cadastros simultâneos nunca ultrapassam o teto.
    user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${FREE_CAPACITY_LOCK})`;
      await assertFreeCapacity(tx);
      return tx.user.create({ data: { name, email, role, passwordHash, consentAt: new Date() } });
    }, { maxWait: 10_000, timeout: 20_000 });
  } catch (e) {
    if (e.code === 'P2002') throw conflict('E-mail já cadastrado'); // cadastro simultâneo com o mesmo e-mail
    throw e;
  }
  return session(user);
}

const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_COST);

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // compara sempre, para não vazar a existência do e-mail pelo tempo de resposta
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('E-mail ou senha incorretos');
  if (user.status === 'SUSPENSO') throw unauthorized('Conta suspensa');
  return session(user);
}

// Rotação: cada refresh token só vale uma vez. Reuso de token revogado derruba todas as sessões do usuário.
export async function refresh(token) {
  if (!token) throw unauthorized();
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!record) throw unauthorized('Sessão inválida');
  if (record.revokedAt) {
    // Reuso logo após a rotação costuma ser corrida legítima (abas/requisições simultâneas): só recusa.
    // Reuso tardio indica token vazado: encerra todas as sessões do usuário.
    if (Date.now() - record.revokedAt.getTime() > REUSE_GRACE_MS) {
      await prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    throw unauthorized('Sessão inválida');
  }
  if (record.expiresAt < new Date() || record.user.status === 'SUSPENSO') throw unauthorized('Sessão expirada');
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
  return session(record.user);
}

export async function logout(token) {
  if (!token) return;
  await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
}
