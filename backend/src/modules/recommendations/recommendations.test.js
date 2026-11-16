import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const future = () => new Date(Date.now() + 30 * 86400_000).toISOString();

async function makePro(categoryId, name, over = {}, approve = true) {
  const t = await tokenFor('PROFISSIONAL');
  const r = await api().put('/api/professionals/me').set(bearer(t.token)).send({
    displayName: name, categoryId, description: 'Profissional experiente atendendo a região há vários anos.', city: 'Volta Redonda', mode: 'PRESENCIAL',
    radiusKm: 10, whatsapp: '24999990000', services: [{ name: over.service ?? 'Serviço geral' }], ...over.profile,
  });
  if (approve) await prisma.professional.update({ where: { id: r.body.id }, data: { status: 'APROVADO', approvedAt: new Date() } });
  return { ...t, id: r.body.id };
}

async function setup() {
  const eletr = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
  const pintor = await prisma.category.create({ data: { name: 'Pintor', slug: 'pintor' } });
  const emp = await tokenFor('EMPRESA');
  await api().put('/api/companies/me').set(bearer(emp.token)).send({ tradeName: 'Padaria', city: 'Volta Redonda', phone: '2433334444', responsibleName: 'Carlos' });
  const admin = await tokenFor('ADMIN');
  return { eletr, pintor, emp, admin };
}
const publish = async ({ emp, admin }, categoryId, over = {}) => {
  const o = (await api().post('/api/opportunities').set(bearer(emp.token)).send({
    title: 'Troca de fiação elétrica', description: 'Serviço de instalação elétrica na cozinha da padaria.', categoryId, city: 'Volta Redonda',
    mode: 'PRESENCIAL', deadline: future(), contractType: 'PONTUAL', contactChannel: 'contato@padaria.com', ...over,
  })).body;
  await api().post(`/api/opportunities/admin/${o.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
  return o;
};
const mine = (t) => api().get('/api/recommendations/mine').set(bearer(t.token));

describe('CHAMALÁ Conecta — recomendações', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('ao publicar, recomenda só quem é compatível — nunca especialidades incompatíveis', async () => {
    const ctx = await setup();
    const eletricista = await makePro(ctx.eletr.id, 'Zé Eletricista', { service: 'Instalação elétrica' });
    const pintor = await makePro(ctx.pintor.id, 'Ana Pintora', { service: 'Pintura de paredes' });
    await publish(ctx, ctx.eletr.id);
    const ok = await mine(eletricista);
    assert.equal(ok.body.length, 1);
    assert.ok(ok.body[0].score >= 80);
    assert.match(ok.body[0].justification, /Recomendada porque/);
    assert.equal(ok.body[0].breakdown.length, 6);
    assert.equal((await mine(pintor)).body.length, 0);
  });

  it('não recomenda para perfis não aprovados; recomenda assim que forem aprovados (e notifica uma vez)', async () => {
    const ctx = await setup();
    const pendente = await makePro(ctx.eletr.id, 'Pedro Pendente', { service: 'Instalação elétrica' }, false);
    await publish(ctx, ctx.eletr.id);
    assert.equal(await prisma.recommendation.count(), 0);
    const r = await api().post(`/api/professionals/admin/${pendente.id}/review`).set(bearer(ctx.admin.token)).send({ action: 'APROVAR' });
    assert.equal(r.status, 200);
    assert.equal((await mine(pendente)).body.length, 1);
    const n = await api().get('/api/notifications').set(bearer(pendente.token));
    assert.equal(n.body.unread, 1);
  });

  it('notifica profissionais compatíveis na publicação, respeita opt-out e não duplica ao republicar', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Ativo', { service: 'Instalação elétrica' });
    const b = await makePro(ctx.eletr.id, 'Silencioso', { service: 'Instalação elétrica' });
    const off = await api().put('/api/notifications/preferences').set(bearer(b.token)).send({ notifyRecommendations: false });
    assert.equal(off.body.notifyRecommendations, false);
    const o = await publish(ctx, ctx.eletr.id);
    assert.equal((await api().get('/api/notifications').set(bearer(a.token))).body.unread, 1);
    assert.equal((await api().get('/api/notifications').set(bearer(b.token))).body.unread, 0);
    assert.equal((await mine(b)).body.length, 1, 'recomendação existe mesmo sem notificação');
    await api().post(`/api/opportunities/admin/${o.id}/review`).set(bearer(ctx.admin.token)).send({ action: 'REJEITAR', reason: 'x' });
    await api().post(`/api/opportunities/admin/${o.id}/review`).set(bearer(ctx.admin.token)).send({ action: 'APROVAR' });
    assert.equal((await api().get('/api/notifications').set(bearer(a.token))).body.unread, 2, 'nova publicação gera nova notificação');
  });

  it('ler notificações e marcar todas como lidas', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Ativo', { service: 'Instalação elétrica' });
    await publish(ctx, ctx.eletr.id);
    const list = (await api().get('/api/notifications').set(bearer(a.token))).body;
    await api().post(`/api/notifications/${list.items[0].id}/read`).set(bearer(a.token));
    assert.equal((await api().get('/api/notifications').set(bearer(a.token))).body.unread, 0);
    const other = await tokenFor('PROFISSIONAL');
    assert.equal((await api().get('/api/notifications').set(bearer(other.token))).body.items.length, 0, 'isolamento entre usuários');
  });

  it('recomendação some quando a oportunidade é encerrada, rejeitada ou expira; descartar funciona', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Ativo', { service: 'Instalação elétrica' });
    const o = await publish(ctx, ctx.eletr.id);
    const rec = (await mine(a)).body[0];
    assert.equal((await api().post(`/api/recommendations/${rec.id}/dismiss`).set(bearer(a.token))).status, 204);
    assert.equal((await mine(a)).body.length, 0);
    const o2 = await publish(ctx, ctx.eletr.id, { title: 'Outra troca de fiação' });
    assert.equal((await mine(a)).body.length, 1);
    await prisma.opportunity.update({ where: { id: o2.id }, data: { deadline: new Date(Date.now() - 1000) } });
    assert.equal((await mine(a)).body.length, 0, 'expirada não aparece');
    const o3 = await publish(ctx, ctx.eletr.id, { title: 'Terceira troca de fiação' });
    await api().post(`/api/opportunities/${o3.id}/close`).set(bearer(ctx.emp.token));
    assert.equal(await prisma.recommendation.count({ where: { opportunityId: o3.id } }), 0);
    assert.ok(o.id);
  });

  it('profissional não vê recomendação de outro; só PROFISSIONAL acessa', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Ativo', { service: 'Instalação elétrica' });
    const b = await makePro(ctx.eletr.id, 'Outro', { service: 'Instalação elétrica' });
    await publish(ctx, ctx.eletr.id);
    const rec = (await mine(a)).body[0];
    assert.equal((await api().post(`/api/recommendations/${rec.id}/dismiss`).set(bearer(b.token))).status, 404);
    assert.equal((await api().get('/api/recommendations/mine').set(bearer(ctx.emp.token))).status, 403);
    assert.equal((await api().get('/api/recommendations/mine')).status, 401);
  });

  it('indica interesse já manifestado na lista de recomendadas', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Ativo', { service: 'Instalação elétrica' });
    const o = await publish(ctx, ctx.eletr.id);
    await api().post(`/api/opportunities/${o.id}/interest`).set(bearer(a.token)).send({});
    assert.equal((await mine(a)).body[0].interested, true);
  });

  it('administração altera pesos: validação, auditoria e recálculo', async () => {
    const ctx = await setup();
    const a = await makePro(ctx.eletr.id, 'Longe', { service: 'Instalação elétrica', profile: { city: 'Resende' } });
    await publish(ctx, ctx.eletr.id);
    const before = (await mine(a)).body[0].score;
    const put = (token, body) => api().put('/api/recommendations/config').set(bearer(token)).send(body);
    const ok = { weights: { category: 10, location: 60, qualifications: 10, availability: 10, mode: 5, preferences: 5 }, minScore: 10 };
    assert.equal((await put(ctx.admin.token, { ...ok, weights: { ...ok.weights, location: 50 } })).status, 400, 'soma ≠ 100');
    assert.equal((await put(ctx.emp.token, ok)).status, 403);
    const mod = await tokenFor('MODERADOR');
    assert.equal((await put(mod.token, ok)).status, 403);
    assert.equal((await put(ctx.admin.token, ok)).status, 200);
    const after = (await mine(a)).body[0].score;
    assert.ok(after < before, `${after} < ${before}: localização distante pesa mais`);
    const cfg = await api().get('/api/recommendations/config').set(bearer(mod.token));
    assert.equal(cfg.body.weights.location, 60);
    const log = await api().get('/api/audit?entity=MatchConfig').set(bearer(ctx.admin.token));
    assert.equal(log.body.items[0].action, 'MATCH_CONFIG_UPDATE');
  });

  it('limiar mínimo exclui matches fracos', async () => {
    const ctx = await setup();
    await makePro(ctx.eletr.id, 'Longe e indisponível', { service: 'Instalação elétrica', profile: { city: 'Resende', available: false, mode: 'REMOTO' } });
    await publish(ctx, ctx.eletr.id);
    assert.equal(await prisma.recommendation.count(), 0, 'score abaixo do limiar padrão (50)');
  });

  it('admin vê os profissionais compatíveis de uma oportunidade', async () => {
    const ctx = await setup();
    await makePro(ctx.eletr.id, 'Zé', { service: 'Instalação elétrica' });
    const o = await publish(ctx, ctx.eletr.id);
    const r = await api().get(`/api/recommendations/admin/opportunity/${o.id}`).set(bearer(ctx.admin.token));
    assert.equal(r.status, 200);
    assert.equal(r.body[0].professional.displayName, 'Zé');
    assert.equal((await api().get(`/api/recommendations/admin/opportunity/${o.id}`).set(bearer(ctx.emp.token))).status, 403);
  });
});
