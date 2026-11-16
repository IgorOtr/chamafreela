import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { seedPlans } from '../plans/defaults.js';
import { setIbgeClient } from '../territorial/territorial.service.js';
import { recordEvent } from './events.js';

describe('relatórios avançados e falhas operacionais', () => {
  beforeEach(async () => { await resetDb(); await seedPlans(prisma); });
  after(async () => { setIbgeClient(null); await prisma.$disconnect(); });

  it('apenas administradores acessam relatórios', async () => {
    const pro = await tokenFor('PROFISSIONAL'), mod = await tokenFor('MODERADOR'), admin = await tokenFor('ADMIN');
    for (const path of ['/api/admin/reports/overview', '/api/admin/reports/export?dataset=signups', '/api/admin/reports/events']) {
      assert.equal((await api().get(path)).status, 401, path);
      assert.equal((await api().get(path).set(bearer(pro.token))).status, 403, path);
      assert.equal((await api().get(path).set(bearer(mod.token))).status, 403, path);
      assert.equal((await api().get(path).set(bearer(admin.token))).status, 200, path);
    }
  });

  it('cadastros por mês e papel: preenche meses vazios e respeita o intervalo', async () => {
    const admin = await tokenFor('ADMIN');
    await tokenFor('PROFISSIONAL'); await tokenFor('PROFISSIONAL'); await tokenFor('EMPRESA');
    const old = await tokenFor('CLIENTE');
    await prisma.user.update({ where: { id: old.user.id }, data: { createdAt: new Date(Date.now() - 400 * 86400_000) } });
    const o = (await api().get('/api/admin/reports/overview?months=6').set(bearer(admin.token))).body;
    assert.equal(o.signups.length, 6);
    const now = new Date().toISOString().slice(0, 7);
    assert.equal(o.signups.at(-1).month, now);
    assert.deepEqual([o.signups.at(-1).PROFISSIONAL, o.signups.at(-1).EMPRESA, o.signups.at(-1).CLIENTE], [2, 1, 0], 'cliente antigo fora do intervalo');
    assert.equal(o.signups.at(-1).total, 3);
    assert.ok(o.signups.slice(0, -1).every((s) => s.total === 0));
    assert.equal((await api().get('/api/admin/reports/overview?months=99').set(bearer(admin.token))).status, 400);
  });

  it('utilização dos módulos, funil e assinaturas refletem os dados reais', async () => {
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL');
    await api().post('/api/simulations').set(bearer(u.token)).send({ name: 'Simulação', iterations: 1000, inputs: { ticket: 80, expectedClients: 10, workDaysPerMonth: 20, servicesPerDay: 3 } });
    await api().post('/api/studio/generate').set(bearer(u.token)).send({ type: 'LEGENDA', brief: { businessName: 'Zé', service: 'elétrica', tone: 'PROFISSIONAL' } });
    await api().post('/api/subscriptions/admin/grant').set(bearer(admin.token)).send({ userId: u.user.id, planCode: 'PRO' });
    const o = (await api().get('/api/admin/reports/overview').set(bearer(admin.token))).body;
    const m = Object.fromEntries(o.modules.map((x) => [x.key, x.value]));
    assert.equal(m.simulations, 1);
    assert.equal(m.studioGenerations, 1);
    assert.equal(o.subscriptions.activePaid, 1);
    assert.equal(o.subscriptions.nonStaffUsers, 1);
    assert.equal(o.subscriptions.freeUsers, 0);
    assert.deepEqual(o.subscriptions.payments, { count: 0, paidCents: 0 }, 'sem cobrança ativa');
    assert.ok(o.subscriptions.byPlanStatus.some((s) => s.planCode === 'PRO' && s.status === 'ATIVA' && s.count === 1));
    assert.equal(o.funnel.interestsPerOpportunity, null);
  });

  it('dashboard mostra a situação das assinaturas', async () => {
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL');
    await api().post('/api/subscriptions/admin/grant').set(bearer(admin.token)).send({ userId: u.user.id, planCode: 'PRO' });
    const d = (await api().get('/api/admin/dashboard').set(bearer(admin.token))).body;
    assert.equal(d.subscriptions.activePaid, 1);
    assert.equal(d.subscriptions.byPlan.PRO, 1);
  });

  it('exporta CSV (UTF-8 com BOM, separador ;) e valida o conjunto de dados', async () => {
    const admin = await tokenFor('ADMIN');
    await tokenFor('PROFISSIONAL');
    const r = await api().get('/api/admin/reports/export?dataset=signups&months=3').set(bearer(admin.token));
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /text\/csv/);
    assert.match(r.headers['content-disposition'], /cadastros-por-mes\.csv/);
    assert.ok(r.text.startsWith('﻿"Mês";"PROFISSIONAL";"EMPRESA";"CLIENTE";"Total"'));
    assert.equal(r.text.trim().split('\n').length, 4);
    assert.match((await api().get('/api/admin/reports/export?dataset=modules').set(bearer(admin.token))).text, /Módulo/);
    assert.match((await api().get('/api/admin/reports/export?dataset=subscriptions').set(bearer(admin.token))).text, /Plano/);
    assert.equal((await api().get('/api/admin/reports/export?dataset=usuarios').set(bearer(admin.token))).status, 400);
  });

  it('falhas operacionais: eventos são gravados (truncados) e listados; falha na sincronização do IBGE gera alerta', async () => {
    const admin = await tokenFor('ADMIN');
    await recordEvent({ level: 'error', source: 'api', message: 'x'.repeat(900), path: '/api/x', method: 'GET' });
    setIbgeClient({
      fetchMunicipality: async (code) => ({ code, name: 'Volta Redonda', uf: 'RJ' }), fetchGeometry: async () => ({ features: [] }),
      fetchCensus: async () => { throw new Error('IBGE respondeu 503'); }, fetchPib: async () => ({ value: 1, period: '2023' }), fetchCempreSections: async () => ({ sections: [], period: '2021' }),
    });
    await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    const ev = (await api().get('/api/admin/reports/events?limit=10').set(bearer(admin.token))).body;
    assert.equal(ev.length, 2);
    assert.ok(ev.some((e) => e.source === 'ibge-sync' && e.level === 'warn' && /censo/.test(e.message)));
    const long = ev.find((e) => e.source === 'api');
    assert.equal(long.message.length, 500);
    assert.equal((await api().get('/api/admin/reports/events?limit=1').set(bearer(admin.token))).body.length, 1);
    assert.equal((await api().get('/api/admin/reports/events?limit=999').set(bearer(admin.token))).status, 400);
  });
});
