import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, createUser, resetDb, tokenFor } from '../../test/helpers.js';
import { seedPlans } from './defaults.js';

const reg = (n, role = 'PROFISSIONAL') => api().post('/api/auth/register').send({ name: `Pessoa ${n}`, email: `p${n}@teste.com`, password: 'Senha1234', role, consent: true });
const setMax = (maxUsers) => prisma.plan.update({ where: { code: 'FREE' }, data: { maxUsers } });
const patch = (t, body, code = 'FREE') => api().patch(`/api/plans/admin/${code}`).set(bearer(t.token)).send(body);

describe('limite de cadastros do plano FREE', () => {
  beforeEach(async () => { await resetDb(); await seedPlans(prisma); });
  after(() => prisma.$disconnect());

  it('sem limite definido (padrão), qualquer número de pessoas pode se cadastrar', async () => {
    for (let i = 0; i < 4; i++) assert.equal((await reg(i)).status, 201);
    assert.deepEqual((await api().get('/api/plans/capacity')).body, { limited: false, open: true });
  });

  it('bloqueia novos cadastros ao atingir o limite, com mensagem clara, e não cria a conta', async () => {
    await setMax(2);
    assert.equal((await reg(1)).status, 201);
    assert.equal((await reg(2, 'EMPRESA')).status, 201, 'empresas e clientes também ocupam vagas FREE');
    const blocked = await reg(3, 'CLIENTE');
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.erro.codigo, 'FREE_CAPACITY_REACHED');
    assert.match(blocked.body.erro.mensagem, /vagas gratuitas/);
    assert.equal(await prisma.user.count({ where: { email: 'p3@teste.com' } }), 0);
    assert.equal(blocked.headers['set-cookie'], undefined, 'nenhuma sessão é emitida');
    assert.deepEqual((await api().get('/api/plans/capacity')).body, { limited: true, open: false });
  });

  it('quem já tem conta continua entrando mesmo com as vagas esgotadas', async () => {
    await setMax(1);
    await reg(1);
    assert.equal((await reg(2)).status, 403);
    const login = await api().post('/api/auth/login').send({ email: 'p1@teste.com', password: 'Senha1234' });
    assert.equal(login.status, 200);
  });

  it('limite 0 fecha os cadastros; remover o limite (nulo) reabre', async () => {
    await setMax(0);
    assert.equal((await reg(1)).status, 403);
    await setMax(null);
    assert.equal((await reg(1)).status, 201);
  });

  it('administradores não ocupam vaga; contas suspensas liberam a vaga; assinantes pagos não contam como FREE', async () => {
    await setMax(2);
    await createUser('ADMIN'); await createUser('MODERADOR'); await createUser('SUPERADMIN');
    const a = (await reg(1)).body.user;
    assert.equal((await reg(2)).status, 201);
    assert.equal((await reg(3)).status, 403, 'cheio com 2 contas FREE (staff não conta)');
    // suspender libera
    await prisma.user.update({ where: { id: a.id }, data: { status: 'SUSPENSO' } });
    assert.equal((await reg(3)).status, 201);
    assert.equal((await reg(4)).status, 403);
    // quem passa a ter plano pago ativo deixa de ocupar vaga FREE
    const p3 = await prisma.user.findUnique({ where: { email: 'p3@teste.com' } });
    await prisma.subscription.create({ data: { userId: p3.id, planCode: 'PRO', status: 'ATIVA', source: 'MANUAL' } });
    assert.equal((await reg(4)).status, 201);
    // assinatura paga expirada volta a ocupar vaga
    await prisma.subscription.updateMany({ where: { userId: p3.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    assert.equal((await reg(5)).status, 403);
  });

  it('é atômico: cadastros simultâneos nunca ultrapassam o limite', async () => {
    await setMax(3);
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => reg(i)));
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.equal(results.filter((r) => r.status === 403).length, 5);
    assert.equal(await prisma.user.count(), 3);
  });

  it('cadastros simultâneos com o MESMO e-mail resultam em 201 + 409 (nunca 500)', async () => {
    const results = await Promise.all([reg(1), reg(1), reg(1)]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
  });

  it('só o SUPERADMIN altera o limite; administrador comum recebe 403 mas continua editando o resto', async () => {
    const admin = await tokenFor('ADMIN'), sup = await tokenFor('SUPERADMIN'), mod = await tokenFor('MODERADOR');
    const denied = await patch(admin, { maxUsers: 10 });
    assert.equal(denied.status, 403);
    assert.match(denied.body.erro.mensagem, /superadministrador/);
    assert.equal((await patch(mod, { maxUsers: 10 })).status, 403);
    assert.equal((await prisma.plan.findUnique({ where: { code: 'FREE' } })).maxUsers, null);
    assert.equal((await patch(admin, { tagline: 'Comece sem pagar' })).status, 200, 'ADMIN edita outros campos');
    const ok = await patch(sup, { maxUsers: 100 });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.maxUsers, 100);
    assert.equal((await patch(sup, { maxUsers: null })).body.maxUsers, null, 'nulo remove o limite');
  });

  it('o limite só existe no FREE e é validado', async () => {
    const sup = await tokenFor('SUPERADMIN');
    assert.equal((await patch(sup, { maxUsers: 5 }, 'PRO')).status, 400);
    for (const bad of [-1, 1.5, 'dez', 20_000_000]) assert.equal((await patch(sup, { maxUsers: bad })).status, 400, String(bad));
    assert.equal((await patch(sup, { maxUsers: 0 })).status, 200);
  });

  it('a alteração fica na auditoria, com o ator', async () => {
    const sup = await tokenFor('SUPERADMIN');
    await patch(sup, { maxUsers: 50 });
    const log = await api().get('/api/audit?entity=Plan').set(bearer(sup.token));
    assert.equal(log.body.items[0].changes.maxUsers.para, 50);
    assert.equal(log.body.items[0].actor.id, sup.user.id);
  });

  it('painel mostra vagas usadas e restantes; dashboard e plano público não vazam o limite', async () => {
    const sup = await tokenFor('SUPERADMIN');
    await setMax(5); await reg(1); await reg(2);
    const admin = (await api().get('/api/plans/admin').set(bearer(sup.token))).body;
    assert.deepEqual(admin.freeCapacity, { max: 5, used: 2, limited: true, open: true, remaining: 3 });
    assert.equal(admin.plans.find((p) => p.code === 'FREE').maxUsers, 5);
    const dash = (await api().get('/api/admin/dashboard').set(bearer(sup.token))).body;
    assert.equal(dash.freeCapacity.used, 2);
    const pub = await api().get('/api/plans');
    assert.ok(pub.body.every((p) => !('maxUsers' in p)), 'vitrine pública não expõe o limite');
    assert.doesNotMatch(JSON.stringify((await api().get('/api/plans/capacity')).body), /5|used|remaining/);
  });

  it('o status de vagas é público e nunca em cache', async () => {
    const r = await api().get('/api/plans/capacity');
    assert.equal(r.status, 200);
    assert.equal(r.headers['cache-control'], 'no-store');
  });
});
