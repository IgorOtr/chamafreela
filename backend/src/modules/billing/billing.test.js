import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { seedPlans } from '../plans/defaults.js';
import { currentPeriod } from './entitlements.js';

const sim = (name = 'Cenário') => ({ name, iterations: 1000, inputs: { ticket: 80, expectedClients: 10, workDaysPerMonth: 20, servicesPerDay: 3 } });
const runSim = (t) => api().post('/api/simulations').set(bearer(t.token)).send(sim());
const setLimits = (code, limits) => prisma.plan.update({ where: { code }, data: { limits } });
const grant = (admin, userId, planCode, extra = {}) => api().post('/api/subscriptions/admin/grant').set(bearer(admin.token)).send({ userId, planCode, ...extra });
const brief = { businessName: 'Zé Eletricista', service: 'instalação elétrica', tone: 'PROFISSIONAL' };

describe('planos editáveis (administração)', () => {
  beforeEach(async () => { await resetDb(); await seedPlans(prisma); });
  after(() => prisma.$disconnect());

  it('apenas quem tem permissão administra planos', async () => {
    const pro = await tokenFor('PROFISSIONAL'), mod = await tokenFor('MODERADOR'), admin = await tokenFor('ADMIN');
    assert.equal((await api().get('/api/plans/admin')).status, 401);
    assert.equal((await api().get('/api/plans/admin').set(bearer(pro.token))).status, 403);
    assert.equal((await api().patch('/api/plans/admin/PRO').set(bearer(mod.token)).send({ priceCents: 1 })).status, 403);
    const r = await api().get('/api/plans/admin').set(bearer(admin.token));
    assert.equal(r.status, 200);
    assert.equal(r.body.billingEnabled, false);
    assert.deepEqual(r.body.plans.map((p) => p.code), ['FREE', 'PRO']);
  });

  it('edita preço, promoção, benefícios e limites; reflete na API pública e gera auditoria', async () => {
    const admin = await tokenFor('ADMIN');
    const r = await api().patch('/api/plans/admin/PRO').set(bearer(admin.token)).send({
      priceCents: 1990, promoPriceCents: 1290, promoMonths: 2, features: ['Tudo do FREE', 'Destaque na busca'], limits: { simulationsPerMonth: 50, studioAssets: null }, highlighted: true,
    });
    assert.equal(r.status, 200);
    const pub = (await api().get('/api/plans')).body.find((p) => p.code === 'PRO');
    assert.equal(pub.priceCents, 1990);
    assert.equal(pub.promoMonths, 2);
    assert.deepEqual(pub.limits, { simulationsPerMonth: 50, studioAssets: null });
    assert.equal(pub.billingEnabled, false);
    const log = await api().get('/api/audit?entity=Plan').set(bearer(admin.token));
    assert.equal(log.body.items[0].action, 'PLAN_UPDATE');
    assert.equal(log.body.items[0].changes.priceCents.para, 1990);
  });

  it('regras de consistência: FREE gratuito e ativo; promoção menor que o preço e com duração; validações de campo', async () => {
    const admin = await tokenFor('ADMIN');
    const patch = (code, body) => api().patch(`/api/plans/admin/${code}`).set(bearer(admin.token)).send(body);
    assert.equal((await patch('FREE', { priceCents: 500 })).status, 400);
    assert.equal((await patch('FREE', { active: false })).status, 400);
    assert.equal((await patch('FREE', { available: false })).status, 400);
    assert.equal((await patch('PRO', { promoPriceCents: 2000 })).status, 400, 'promo ≥ preço');
    assert.equal((await patch('PRO', { promoPriceCents: null })).status, 400, 'promo sem par');
    assert.equal((await patch('PRO', { promoPriceCents: null, promoMonths: null })).status, 200);
    assert.equal((await patch('PRO', { priceCents: -1 })).status, 400);
    assert.equal((await patch('PRO', { features: [] })).status, 400);
    assert.equal((await patch('PRO', { limits: { simulationsPerMonth: -3 } })).status, 400);
    assert.equal((await patch('PRO', {})).status, 400);
    assert.equal((await patch('XPTO', { priceCents: 1 })).status, 404);
    assert.equal((await patch('PRO', { code: 'HACK', id: 'x' })).status, 400, 'campos desconhecidos são descartados -> corpo vazio');
  });

  it('plano inativo some da vitrine pública', async () => {
    const admin = await tokenFor('ADMIN');
    await api().patch('/api/plans/admin/PRO').set(bearer(admin.token)).send({ active: false });
    assert.deepEqual((await api().get('/api/plans')).body.map((p) => p.code), ['FREE']);
  });
});

describe('assinaturas e limites de uso', () => {
  beforeEach(async () => { await resetDb(); await seedPlans(prisma); });
  after(() => prisma.$disconnect());

  it('usuário sem assinatura está no FREE; resumo de uso mostra ilimitado enquanto não há limites', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const me = (await api().get('/api/subscriptions/me').set(bearer(u.token))).body;
    assert.equal(me.plan.code, 'FREE');
    assert.equal(me.subscription, null);
    assert.equal(me.billingEnabled, false);
    assert.ok(me.usage.every((x) => x.limit === null));
    assert.deepEqual(me.payments, []);
    assert.equal(me.plans.length, 2);
  });

  it('limite mensal de simulações do plano é aplicado e informa o motivo', async () => {
    await setLimits('FREE', { simulationsPerMonth: 2 });
    const u = await tokenFor('PROFISSIONAL');
    assert.equal((await runSim(u)).status, 201);
    assert.equal((await runSim(u)).status, 201);
    const blocked = await runSim(u);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.erro.codigo, 'LIMIT_REACHED');
    assert.match(blocked.body.erro.mensagem, /limite do seu plano/);
    assert.equal(blocked.body.erro.detalhes.limite, 2);
    const usage = (await api().get('/api/subscriptions/me').set(bearer(u.token))).body.usage.find((x) => x.key === 'simulationsPerMonth');
    assert.deepEqual([usage.used, usage.limit], [2, 2]);
    assert.equal(await prisma.simulation.count(), 2, 'a simulação bloqueada não é gravada');
  });

  it('limite é por usuário e por mês; mês anterior não conta; limite 0 bloqueia', async () => {
    await setLimits('FREE', { simulationsPerMonth: 1 });
    const a = await tokenFor('PROFISSIONAL'), b = await tokenFor('CLIENTE');
    await prisma.usageCounter.create({ data: { userId: a.user.id, key: 'simulations', period: '2020-01', count: 99 } });
    assert.equal((await runSim(a)).status, 201, 'contador de outro mês ignorado');
    assert.equal((await runSim(a)).status, 403);
    assert.equal((await runSim(b)).status, 201, 'outro usuário não é afetado');
    await setLimits('FREE', { simulationsPerMonth: 0 });
    assert.equal((await runSim(await tokenFor('PROFISSIONAL'))).status, 403);
  });

  it('o limite é atômico: requisições simultâneas nunca ultrapassam o teto', async () => {
    await setLimits('FREE', { simulationsPerMonth: 3 });
    const u = await tokenFor('PROFISSIONAL');
    const results = await Promise.all(Array.from({ length: 8 }, () => runSim(u)));
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    assert.equal(results.filter((r) => r.status === 403).length, 5);
    const row = await prisma.usageCounter.findFirst({ where: { userId: u.user.id, key: 'simulations', period: currentPeriod() } });
    assert.equal(row.count, 3);
  });

  it('administração (staff) não sofre limites', async () => {
    await setLimits('FREE', { simulationsPerMonth: 0 });
    const admin = await tokenFor('ADMIN');
    assert.equal((await runSim(admin)).status, 201);
  });

  it('Studio: gerações mensais (textos e calendário) e materiais salvos respeitam o plano', async () => {
    await setLimits('FREE', { studioGenerationsPerMonth: 2, studioAssets: 1 });
    const u = await tokenFor('PROFISSIONAL');
    const gen = () => api().post('/api/studio/generate').set(bearer(u.token)).send({ type: 'LEGENDA', brief });
    const cal = () => api().post('/api/studio/calendar/generate').set(bearer(u.token)).send({ brief, weeks: 1, postsPerWeek: 2, startDate: '2026-11-16' });
    assert.equal((await gen()).status, 200);
    assert.equal((await cal()).status, 200);
    const blocked = await gen();
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.erro.codigo, 'LIMIT_REACHED');
    assert.equal((await cal()).status, 403);
    const asset = (title) => api().post('/api/studio/assets').set(bearer(u.token)).send({ type: 'LEGENDA', title, content: 'x' });
    assert.equal((await asset('um')).status, 201);
    const full = await asset('dois');
    assert.equal(full.status, 403);
    assert.equal(full.body.erro.codigo, 'LIMIT_REACHED');
    // prévia de logotipo não consome geração
    assert.equal((await api().post('/api/studio/logo/preview').set(bearer(u.token)).send({ businessName: 'Zé', colors: { primary: '#0f5c4d', secondary: '#e6f4ef', accent: '#f59e0b', text: '#14211e', background: '#ffffff' }, fontKey: 'moderna', logo: { shape: 'circulo', wordmark: true } })).status, 200);
  });

  it('troca de plano pelo usuário: pago bloqueado (cobrança desativada); FREE permitido; staff e plano inexistente rejeitados', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const change = (t, planCode) => api().post('/api/subscriptions/me/change').set(bearer(t.token)).send({ planCode });
    const indisponivel = await change(u, 'PRO');
    assert.equal(indisponivel.status, 409);
    assert.match(indisponivel.body.erro.mensagem, /ainda não está disponível/);
    await prisma.plan.update({ where: { code: 'PRO' }, data: { available: true } });
    const semCobranca = await change(u, 'PRO');
    assert.equal(semCobranca.status, 409);
    assert.equal(semCobranca.body.erro.codigo, 'BILLING_DISABLED');
    assert.equal(await prisma.subscription.count(), 0, 'nada é criado nem cobrado');
    assert.equal(await prisma.payment.count(), 0);
    assert.equal((await change(u, 'FREE')).status, 200);
    assert.equal((await change(u, 'XPTO')).status, 404);
    assert.equal((await change(await tokenFor('ADMIN'), 'PRO')).status, 403);
    assert.equal((await api().post('/api/subscriptions/me/cancel').set(bearer(u.token))).status, 400, 'sem assinatura ativa');
  });

  it('concessão manual: aplica benefícios e limites do plano, substitui a anterior, audita e respeita permissões', async () => {
    await setLimits('FREE', { simulationsPerMonth: 1 });
    await setLimits('PRO', { simulationsPerMonth: 5 });
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL');
    assert.equal((await runSim(u)).status, 201);
    assert.equal((await runSim(u)).status, 403);
    assert.equal((await grant(await tokenFor('MODERADOR'), u.user.id, 'PRO')).status, 403);
    assert.equal((await grant(u, u.user.id, 'PRO')).status, 403, 'usuário não se concede plano');
    const g = await grant(admin, u.user.id, 'PRO', { note: 'Parceria de lançamento' });
    assert.equal(g.status, 201);
    const me = (await api().get('/api/subscriptions/me').set(bearer(u.token))).body;
    assert.equal(me.plan.code, 'PRO');
    assert.equal(me.subscription.source, 'MANUAL');
    assert.equal((await runSim(u)).status, 201, 'limite do PRO (5) vale agora; já usou 1');
    // nova concessão substitui a anterior (somente uma ativa)
    await grant(admin, u.user.id, 'FREE');
    assert.equal(await prisma.subscription.count({ where: { userId: u.user.id, status: 'ATIVA' } }), 0);
    const log = await api().get('/api/audit?entity=Subscription').set(bearer(admin.token));
    assert.ok(log.body.items.some((i) => i.action === 'SUBSCRIPTION_GRANT' && i.changes.plano === 'PRO' && i.changes.nota === 'Parceria de lançamento'));
  });

  it('concessão com validações: data futura, usuário/plano existentes, sem assinatura para staff', async () => {
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL'), staff = await tokenFor('MODERADOR');
    assert.equal((await grant(admin, u.user.id, 'PRO', { endsAt: '2020-01-01' })).status, 400);
    assert.equal((await grant(admin, u.user.id, 'XPTO')).status, 404);
    assert.equal((await grant(admin, '00000000-0000-4000-8000-000000000000', 'PRO')).status, 404);
    assert.equal((await grant(admin, staff.user.id, 'PRO')).status, 400);
    assert.equal((await grant(admin, 'nao-e-uuid', 'PRO')).status, 400);
  });

  it('assinatura expirada volta ao FREE; cancelamento (usuário e admin) encerra e audita', async () => {
    await setLimits('FREE', { simulationsPerMonth: 0 });
    await setLimits('PRO', { simulationsPerMonth: null });
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL');
    const sub = (await grant(admin, u.user.id, 'PRO')).body;
    assert.equal((await runSim(u)).status, 201);
    await prisma.subscription.update({ where: { id: sub.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.plan.code, 'FREE');
    assert.equal((await runSim(u)).status, 403);

    await grant(admin, u.user.id, 'PRO');
    assert.equal((await api().post('/api/subscriptions/me/cancel').set(bearer(u.token))).status, 204);
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.plan.code, 'FREE');

    const again = (await grant(admin, u.user.id, 'PRO')).body;
    assert.equal((await api().post(`/api/subscriptions/admin/${again.id}/cancel`).set(bearer(admin.token))).status, 204);
    assert.equal((await api().post(`/api/subscriptions/admin/${again.id}/cancel`).set(bearer(admin.token))).status, 400, 'já cancelada');
    assert.equal((await api().post('/api/subscriptions/admin/00000000-0000-4000-8000-000000000000/cancel').set(bearer(admin.token))).status, 404);
    const log = await api().get('/api/audit?entity=Subscription&pageSize=50').set(bearer(admin.token));
    assert.ok(log.body.items.filter((i) => i.action === 'SUBSCRIPTION_CANCEL').length >= 2);
  });

  it('listagem administrativa com filtros e paginação', async () => {
    const admin = await tokenFor('ADMIN'), a = await tokenFor('PROFISSIONAL'), b = await tokenFor('EMPRESA');
    await grant(admin, a.user.id, 'PRO'); const sb = (await grant(admin, b.user.id, 'PRO')).body;
    await api().post(`/api/subscriptions/admin/${sb.id}/cancel`).set(bearer(admin.token));
    const list = (qs = '') => api().get(`/api/subscriptions/admin${qs}`).set(bearer(admin.token));
    assert.equal((await list()).body.total, 2);
    assert.equal((await list('?status=ATIVA')).body.total, 1);
    assert.equal((await list(`?q=${encodeURIComponent(a.user.email)}`)).body.items[0].user.email, a.user.email);
    assert.equal((await list('?pageSize=1&page=2')).body.items.length, 1);
    assert.equal((await api().get('/api/subscriptions/admin').set(bearer(a.token))).status, 403);
    assert.equal((await list('?status=QUALQUER')).status, 400);
  });
});
