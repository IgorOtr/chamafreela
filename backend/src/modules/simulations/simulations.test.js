import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const inputs = (over = {}) => ({
  ticket: 80, expectedClients: 30, servicesPerClient: 1, workDaysPerMonth: 22, servicesPerDay: 3, fixedCostsMonthly: 1200,
  variableCostPerService: 15, travelCostPerService: 5, taxRatePercent: 6, fixedTaxMonthly: 0, equipmentInvestment: 3000, initialCapital: 5000, ...over,
});
const body = (over = {}) => ({ name: 'Cenário base', city: 'Volta Redonda', activity: 'Eletricista', inputs: inputs(), iterations: 5000, ...over });
const post = (t, b) => api().post('/api/simulations').set(bearer(t.token)).send(b);

describe('CHAMALÁ Insights — API de simulações', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('exige autenticação', async () => {
    assert.equal((await api().get('/api/simulations')).status, 401);
    assert.equal((await api().post('/api/simulations').send(body())).status, 401);
  });

  it('executa, grava e devolve resultados, premissas com origem, versão do modelo e semente', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const r = await post(u, body());
    assert.equal(r.status, 201);
    assert.match(r.body.modelVersion, /^mc-/);
    assert.ok(Number.isInteger(r.body.seed));
    assert.equal(r.body.iterations, 5000);
    for (const k of ['summary', 'scenarios', 'breakEven', 'roi', 'capital', 'histogram', 'sensitivity', 'explanations', 'warnings', 'disclaimer']) assert.ok(k in r.body.results, k);
    assert.ok(r.body.assumptions.every((a) => ['INFORMADO', 'ESTIMADO_PADRAO'].includes(a.origin)));
    assert.equal(r.body.assumptions.find((a) => a.key === 'demandVariationPercent').origin, 'ESTIMADO_PADRAO');
    const stored = await api().get(`/api/simulations/${r.body.id}`).set(bearer(u.token));
    assert.deepEqual(stored.body.results.summary, r.body.results.summary);
  });

  it('reprodutibilidade: com semente fixa o resultado é idêntico; sem semente, a semente usada é registrada e reproduz', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const a = (await post(u, body({ seed: 12345 }))).body, b = (await post(u, body({ seed: 12345 }))).body;
    assert.deepEqual(a.results, b.results);
    assert.equal(a.seed, 12345);
    const aleatoria = (await post(u, body())).body;
    const replay = (await post(u, body({ seed: aleatoria.seed }))).body;
    assert.deepEqual(replay.results, aleatoria.results);
  });

  it('premissas ajustadas pelo usuário ficam marcadas como INFORMADO e alteram o resultado', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const padrao = (await post(u, body({ seed: 1 }))).body;
    const ajustado = (await post(u, body({ seed: 1, assumptions: { demandVariationPercent: 60 } }))).body;
    assert.equal(ajustado.assumptions.find((a) => a.key === 'demandVariationPercent').origin, 'INFORMADO');
    assert.notEqual(ajustado.results.summary.stdProfit, padrao.results.summary.stdProfit);
  });

  it('valida entradas: ticket, capacidade, percentuais, iterações, semente e nome', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const bad = async (over, label) => assert.equal((await post(u, body(over))).status, 400, label);
    await bad({ inputs: inputs({ ticket: 0 }) }, 'ticket zero');
    await bad({ inputs: inputs({ ticket: -5 }) }, 'ticket negativo');
    await bad({ inputs: inputs({ servicesPerDay: 0.01, workDaysPerMonth: 1 }) }, 'capacidade < 1');
    await bad({ inputs: inputs({ taxRatePercent: 150 }) }, 'imposto > 100%');
    await bad({ inputs: inputs({ workDaysPerMonth: 40 }) }, 'dias > 31');
    await bad({ iterations: 10 }, 'poucas iterações');
    await bad({ iterations: 5_000_000 }, 'iterações demais');
    await bad({ seed: -1 }, 'semente negativa');
    await bad({ name: '' }, 'sem nome');
    await bad({ assumptions: { demandVariationPercent: 500 } }, 'variação absurda');
    const { ticket, ...semTicket } = inputs();
    assert.equal(ticket, 80);
    await bad({ inputs: semTicket }, 'ticket ausente');
  });

  it('listagem paginada traz resumo; cada usuário só enxerga as próprias simulações', async () => {
    const a = await tokenFor('PROFISSIONAL'), b = await tokenFor('CLIENTE');
    const s1 = (await post(a, body({ name: 'A1' }))).body;
    await post(a, body({ name: 'A2' }));
    await post(b, body({ name: 'B1' }));
    const list = (await api().get('/api/simulations').set(bearer(a.token))).body;
    assert.equal(list.total, 2);
    assert.deepEqual(list.items.map((i) => i.name), ['A2', 'A1']);
    assert.ok('probLoss' in list.items[0].headline && 'p50' in list.items[0].headline);
    assert.equal((await api().get(`/api/simulations/${s1.id}`).set(bearer(b.token))).status, 404);
    assert.equal((await api().delete(`/api/simulations/${s1.id}`).set(bearer(b.token))).status, 404);
    assert.equal((await api().get('/api/simulations?pageSize=1&page=2').set(bearer(a.token))).body.items.length, 1);
  });

  it('exclui a própria simulação', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const s = (await post(u, body())).body;
    assert.equal((await api().delete(`/api/simulations/${s.id}`).set(bearer(u.token))).status, 204);
    assert.equal((await api().get(`/api/simulations/${s.id}`).set(bearer(u.token))).status, 404);
  });

  it('dados observados (IBGE) entram só como contexto rotulado OBSERVADO, quando sincronizados', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sem = (await post(u, body())).body;
    assert.deepEqual(sem.observed, []);
    assert.ok(sem.results.warnings.some((w) => /Sem dados observados/.test(w)));
    await prisma.municipality.create({ data: { code: '3306305', name: 'Volta Redonda', syncedAt: new Date() } });
    await prisma.territorialIndicator.create({ data: { municipalityCode: '3306305', key: 'population', label: 'População', value: 261563, unit: 'pessoas', period: '2022', source: 'IBGE — Censo 2022', sourceUrl: 'x', methodology: 'm', limitations: 'l' } });
    const com = (await post(u, body({ city: 'volta redonda', seed: 9 }))).body;
    assert.equal(com.observed[0].origin, 'OBSERVADO');
    assert.equal(com.observed[0].value, 261563);
    const igual = (await post(u, body({ city: 'Outra cidade', seed: 9 }))).body;
    assert.deepEqual(com.results.summary, igual.results.summary, 'dado observado não altera o cálculo');
  });

  it('GET /defaults descreve método, premissas padrão e aviso de não-garantia', async () => {
    const u = await tokenFor('CLIENTE');
    const d = (await api().get('/api/simulations/defaults').set(bearer(u.token))).body;
    assert.equal(d.assumptions.demandVariationPercent, 30);
    assert.match(d.disclaimer, /Não é garantia/);
    assert.ok(d.method.length >= 4);
  });
});
