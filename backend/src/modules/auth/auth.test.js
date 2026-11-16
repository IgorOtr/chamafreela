import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, createUser, resetDb } from '../../test/helpers.js';

const valid = { name: 'Maria', email: 'maria@teste.com', password: 'Senha1234', role: 'PROFISSIONAL', consent: true };

describe('auth', () => {
  before(resetDb);
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('registra, devolve token e cookie httpOnly de refresh', async () => {
    const res = await api().post('/api/auth/register').send(valid);
    assert.equal(res.status, 201);
    assert.ok(res.body.accessToken);
    assert.equal(res.body.user.role, 'PROFISSIONAL');
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers['set-cookie'][0], /refresh_token=.*HttpOnly.*SameSite=Strict/i);
  });

  it('não permite auto-cadastro como administrador', async () => {
    for (const role of ['ADMIN', 'SUPERADMIN', 'MODERADOR']) {
      const res = await api().post('/api/auth/register').send({ ...valid, role });
      assert.equal(res.status, 400);
    }
  });

  it('exige consentimento (LGPD) e senha forte', async () => {
    assert.equal((await api().post('/api/auth/register').send({ ...valid, consent: false })).status, 400);
    assert.equal((await api().post('/api/auth/register').send({ ...valid, password: 'curta1' })).status, 400);
  });

  it('rejeita e-mail duplicado', async () => {
    await api().post('/api/auth/register').send(valid);
    assert.equal((await api().post('/api/auth/register').send(valid)).status, 409);
  });

  it('faz login e rejeita senha errada com a mesma mensagem de e-mail inexistente', async () => {
    await api().post('/api/auth/register').send(valid);
    assert.equal((await api().post('/api/auth/login').send({ email: valid.email, password: valid.password })).status, 200);
    const wrong = await api().post('/api/auth/login').send({ email: valid.email, password: 'Errada123' });
    const unknown = await api().post('/api/auth/login').send({ email: 'x@y.com', password: 'Errada123' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.erro.mensagem, unknown.body.erro.mensagem);
  });

  it('bloqueia conta suspensa no login e em tokens já emitidos', async () => {
    const reg = await api().post('/api/auth/register').send(valid);
    await prisma.user.update({ where: { email: valid.email }, data: { status: 'SUSPENSO' } });
    assert.equal((await api().get('/api/auth/me').set(bearer(reg.body.accessToken))).status, 401);
    assert.equal((await api().post('/api/auth/login').send({ email: valid.email, password: valid.password })).status, 401);
  });

  it('/me exige token válido', async () => {
    assert.equal((await api().get('/api/auth/me')).status, 401);
    assert.equal((await api().get('/api/auth/me').set(bearer('lixo'))).status, 401);
  });

  it('rotaciona o refresh token e invalida todas as sessões ao detectar reuso', async () => {
    const reg = await api().post('/api/auth/register').send(valid);
    const cookie1 = reg.headers['set-cookie'][0].split(';')[0];
    const r1 = await api().post('/api/auth/refresh').set('Cookie', cookie1);
    assert.equal(r1.status, 200);
    const cookie2 = r1.headers['set-cookie'][0].split(';')[0];
    // reuso do token antigo
    assert.equal((await api().post('/api/auth/refresh').set('Cookie', cookie1)).status, 401);
    // o novo também foi revogado por segurança
    assert.equal((await api().post('/api/auth/refresh').set('Cookie', cookie2)).status, 401);
  });

  it('refresh rejeita Origin diferente do permitido', async () => {
    const reg = await api().post('/api/auth/register').send(valid);
    const cookie = reg.headers['set-cookie'][0].split(';')[0];
    const res = await api().post('/api/auth/refresh').set('Cookie', cookie).set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
  });

  it('logout revoga o refresh token', async () => {
    const reg = await api().post('/api/auth/register').send(valid);
    const cookie = reg.headers['set-cookie'][0].split(';')[0];
    assert.equal((await api().post('/api/auth/logout').set('Cookie', cookie)).status, 204);
    assert.equal((await api().post('/api/auth/refresh').set('Cookie', cookie)).status, 401);
  });
});
