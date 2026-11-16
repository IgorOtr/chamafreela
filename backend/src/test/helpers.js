import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../database/prisma.js';

export const api = () => request(app);

export async function resetDb() {
  await prisma.dataRequest.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(role, overrides = {}) {
  const password = 'Senha1234';
  const user = await prisma.user.create({
    data: {
      name: `Teste ${role}`,
      email: `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}@teste.com`,
      role,
      passwordHash: await bcrypt.hash(password, 4),
      ...overrides,
    },
  });
  return { user, password };
}

export async function tokenFor(role, overrides) {
  const { user, password } = await createUser(role, overrides);
  const res = await api().post('/api/auth/login').send({ email: user.email, password });
  return { user, token: res.body.accessToken };
}

export const bearer = (t) => ({ Authorization: `Bearer ${t}` });
