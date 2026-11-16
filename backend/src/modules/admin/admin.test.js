import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, createUser, resetDb, tokenFor } from '../../test/helpers.js';

describe('autorização e operações administrativas', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('rotas administrativas: 401 sem token, 403 para papéis sem permissão', async () => {
    assert.equal((await api().get('/api/admin/dashboard')).status, 401);
    for (const role of ['PROFISSIONAL', 'EMPRESA', 'CLIENTE']) {
      const { token } = await tokenFor(role);
      assert.equal((await api().get('/api/admin/dashboard').set(bearer(token))).status, 403, role);
      assert.equal((await api().get('/api/users').set(bearer(token))).status, 403, role);
      assert.equal((await api().get('/api/audit').set(bearer(token))).status, 403, role);
    }
  });

  it('dashboard retorna indicadores para ADMIN', async () => {
    await createUser('PROFISSIONAL');
    const { token } = await tokenFor('ADMIN');
    const res = await api().get('/api/admin/dashboard').set(bearer(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.totalUsers, 2);
    assert.equal(res.body.usersByRole.PROFISSIONAL, 1);
  });

  it('moderador vê usuários mas não pode alterá-los nem gerir categorias', async () => {
    const { token } = await tokenFor('MODERADOR');
    const { user } = await createUser('PROFISSIONAL');
    assert.equal((await api().get('/api/users').set(bearer(token))).status, 200);
    assert.equal((await api().patch(`/api/users/${user.id}`).set(bearer(token)).send({ status: 'SUSPENSO' })).status, 403);
    assert.equal((await api().post('/api/categories').set(bearer(token)).send({ name: 'X Y' })).status, 403);
  });

  it('ADMIN suspende usuário comum, revoga sessões e gera auditoria', async () => {
    const { token } = await tokenFor('ADMIN');
    const { user: target, token: targetToken } = await tokenFor('PROFISSIONAL');
    const res = await api().patch(`/api/users/${target.id}`).set(bearer(token)).send({ status: 'SUSPENSO' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'SUSPENSO');
    assert.equal((await api().get('/api/auth/me').set(bearer(targetToken))).status, 401);
    const log = await api().get('/api/audit').set(bearer(token));
    assert.equal(log.body.items[0].action, 'USER_UPDATE');
    assert.equal(log.body.items[0].entityId, target.id);
  });

  it('ADMIN não promove ninguém a administrador nem altera outro administrador', async () => {
    const { token } = await tokenFor('ADMIN');
    const { user: prof } = await createUser('PROFISSIONAL');
    const { user: other } = await createUser('ADMIN');
    assert.equal((await api().patch(`/api/users/${prof.id}`).set(bearer(token)).send({ role: 'ADMIN' })).status, 403);
    assert.equal((await api().patch(`/api/users/${other.id}`).set(bearer(token)).send({ status: 'SUSPENSO' })).status, 403);
  });

  it('SUPERADMIN promove, mas não suspende a própria conta', async () => {
    const { user: me, token } = await tokenFor('SUPERADMIN');
    const { user: prof } = await createUser('PROFISSIONAL');
    assert.equal((await api().patch(`/api/users/${prof.id}`).set(bearer(token)).send({ role: 'MODERADOR' })).status, 200);
    assert.equal((await api().patch(`/api/users/${me.id}`).set(bearer(token)).send({ status: 'SUSPENSO' })).status, 403);
  });

  it('categorias: público lista ativas; admin cria, edita e desativa (com auditoria)', async () => {
    const { token } = await tokenFor('ADMIN');
    const created = await api().post('/api/categories').set(bearer(token)).send({ name: 'Técnico de Ar-Condicionado' });
    assert.equal(created.status, 201);
    assert.equal(created.body.slug, 'tecnico-de-ar-condicionado');
    assert.equal((await api().post('/api/categories').set(bearer(token)).send({ name: 'Técnico de Ar-Condicionado' })).status, 409);
    assert.equal((await api().get('/api/categories')).body.length, 1);
    await api().patch(`/api/categories/${created.body.id}`).set(bearer(token)).send({ active: false });
    assert.equal((await api().get('/api/categories')).body.length, 0);
    assert.equal((await api().get('/api/categories/all').set(bearer(token))).body.length, 1);
    const audit = await api().get('/api/audit').set(bearer(token));
    assert.deepEqual(audit.body.items.map((i) => i.action).sort(), ['CATEGORY_CREATE', 'CATEGORY_UPDATE']);
  });
});
