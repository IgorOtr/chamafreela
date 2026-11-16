import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { parseValue } from '../../integrations/ibge.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { geometryCenter } from './geo.js';
import { setIbgeClient } from './territorial.service.js';

const square = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-44.2, -22.6], [-44.0, -22.6], [-44.0, -22.4], [-44.2, -22.4], [-44.2, -22.6]]] } }] };

function mockIbge({ failPib = false } = {}) {
  const names = { 3306305: 'Volta Redonda', 3300407: 'Barra Mansa' };
  return {
    fetchMunicipality: async (code) => ({ code, name: names[code] ?? 'Outra', uf: 'RJ' }),
    fetchGeometry: async () => square,
    fetchCensus: async () => ({ population: 261563, area: 182.9, density: 1430.2, period: '2022' }),
    fetchPib: async () => { if (failPib) throw new Error('IBGE respondeu 500'); return { value: 15307615, period: '2023' }; },
    fetchCempreSections: async () => ({ period: '2021', sections: [{ code: 'G', label: 'Comércio', units: 3001, workers: 20000 }, { code: 'Q', label: 'Saúde', units: 790, workers: null }] }),
  };
}

async function proIn(city, categoryId, status = 'APROVADO') {
  const t = await tokenFor('PROFISSIONAL');
  const r = await api().put('/api/professionals/me').set(bearer(t.token)).send({
    displayName: `Pro ${Math.random().toString(36).slice(2, 6)}`, categoryId, description: 'Profissional atendendo a região há vários anos.', city, mode: 'PRESENCIAL',
    radiusKm: 10, whatsapp: '24999990000', services: [{ name: 'Serviço' }],
  });
  await prisma.professional.update({ where: { id: r.body.id }, data: { status, approvedAt: new Date() } });
}

describe('CHAMALÁ Mapa — inteligência territorial', () => {
  beforeEach(async () => { await resetDb(); setIbgeClient(mockIbge()); });
  after(async () => { setIbgeClient(null); await prisma.$disconnect(); });

  it('interpreta convenções do IBGE ("-" = 0; X, .., ... = indisponível)', () => {
    assert.equal(parseValue('261563'), 261563);
    assert.equal(parseValue('1430,2'), 1430.2);
    assert.equal(parseValue('-'), 0);
    for (const v of ['X', '..', '...', '', null, undefined]) assert.equal(parseValue(v), null, String(v));
  });

  it('centro geométrico de polígono', () => {
    const c = geometryCenter(square);
    assert.ok(Math.abs(c.lat - -22.5) < 1e-9 && Math.abs(c.lng - -44.1) < 1e-9);
    assert.equal(geometryCenter({ features: [] }), null);
  });

  it('exige login para consultar e permissão para sincronizar', async () => {
    assert.equal((await api().get('/api/territorial/overview')).status, 401);
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await api().get('/api/territorial/overview').set(bearer(pro.token))).status, 200);
    assert.equal((await api().post('/api/territorial/admin/sync').set(bearer(pro.token)).send({})).status, 403);
    const mod = await tokenFor('MODERADOR');
    assert.equal((await api().post('/api/territorial/admin/sync').set(bearer(mod.token)).send({})).status, 403);
    const admin = await tokenFor('ADMIN');
    assert.equal((await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['abc'] })).status, 400);
  });

  it('sincroniza com o IBGE, grava indicadores e audita', async () => {
    const admin = await tokenFor('ADMIN');
    const r = await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body[0].ok, ['geometria', 'censo', 'pib', 'cempre']);
    assert.equal(r.body[0].failed.length, 0);
    const m = await prisma.municipality.findUnique({ where: { code: '3306305' } });
    assert.ok(m.syncedAt && m.centerLat && m.geojson);
    assert.equal(await prisma.territorialIndicator.count({ where: { key: 'population' } }), 1);
    const again = await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    assert.equal(again.status, 200);
    assert.equal(await prisma.territorialIndicator.count({ where: { municipalityCode: '3306305', key: 'units_by_section' } }), 2, 'idempotente (upsert)');
    const log = await api().get('/api/audit?entity=Municipality').set(bearer(admin.token));
    assert.equal(log.body.items[0].action, 'TERRITORIAL_SYNC');
  });

  it('falha de um indicador não derruba os demais e aparece como lacuna', async () => {
    setIbgeClient(mockIbge({ failPib: true }));
    const admin = await tokenFor('ADMIN');
    const r = await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    assert.deepEqual(r.body[0].ok, ['geometria', 'censo', 'cempre']);
    assert.equal(r.body[0].failed[0].indicador, 'pib');
    const d = await api().get('/api/territorial/municipalities/3306305').set(bearer(admin.token));
    assert.equal(d.status, 200);
    assert.ok(!d.body.indicators.some((i) => i.key === 'pib'));
    assert.ok(d.body.gaps.some((g) => /PIB/.test(g)), 'lacuna explícita, sem inventar valor');
  });

  it('todo indicador traz fonte, período, unidade, escala, metodologia e limitações', async () => {
    const admin = await tokenFor('ADMIN');
    await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    const d = (await api().get('/api/territorial/municipalities/3306305').set(bearer(admin.token))).body;
    assert.equal(d.indicators.length, 4);
    for (const i of d.indicators) {
      for (const f of ['source', 'sourceUrl', 'period', 'unit', 'scale', 'methodology', 'limitations']) assert.ok(i[f], `${i.key}.${f}`);
    }
    assert.equal(d.indicators.find((i) => i.key === 'population').value, 261563);
    for (const f of ['source', 'period', 'methodology', 'limitations']) assert.ok(d.sectors.meta[f], `setores.${f}`);
    assert.match(d.sectors.meta.limitations, /concorrência/);
    assert.deepEqual(d.sectors.items.map((s) => s.code), ['G', 'Q']);
    assert.equal(d.sectors.items[1].workers, null, 'sigilo permanece indisponível, não vira zero');
    assert.ok(d.gaps.some((g) => /sigilo/.test(g)));
    assert.ok(d.notes.length >= 3);
    assert.ok(d.geometry.features.length === 1);
  });

  it('município não sincronizado retorna 404 em vez de dados inventados', async () => {
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await api().get('/api/territorial/municipalities/3304201').set(bearer(pro.token))).status, 404);
  });

  it('visão geral: contagens da plataforma por município (sem acento/caixa), filtro por categoria e cidades sem dados', async () => {
    const admin = await tokenFor('ADMIN');
    await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305', '3300407'] });
    const eletr = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    const pintor = await prisma.category.create({ data: { name: 'Pintor', slug: 'pintor' } });
    await proIn('Volta Redonda', eletr.id); await proIn('VOLTA REDONDA', eletr.id); await proIn('volta redonda', pintor.id);
    await proIn('Barra Mansa', eletr.id);
    await proIn('Volta Redonda', eletr.id, 'PENDENTE'); // não aprovado: não conta
    await proIn('Angra dos Reis', eletr.id); // sem dados territoriais

    const geral = (await api().get('/api/territorial/overview').set(bearer(admin.token))).body;
    const vr = geral.items.find((i) => i.code === '3306305');
    assert.equal(vr.professionals, 3);
    assert.equal(geral.items.find((i) => i.code === '3300407').professionals, 1);
    assert.deepEqual(geral.unmapped, ['angra dos reis']);

    const soEletr = (await api().get('/api/territorial/overview?category=eletricista').set(bearer(admin.token))).body;
    assert.equal(soEletr.items.find((i) => i.code === '3306305').professionals, 2);
    assert.equal(soEletr.category.name, 'Eletricista');
    assert.equal((await api().get('/api/territorial/overview?category=nao-existe').set(bearer(admin.token))).status, 400);
  });

  it('detalhe: dados da plataforma só quando há base suficiente; senão avisa que não há dados suficientes', async () => {
    const admin = await tokenFor('ADMIN');
    await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    const eletr = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    for (let i = 0; i < 2; i++) await proIn('Volta Redonda', eletr.id);
    let d = (await api().get('/api/territorial/municipalities/3306305').set(bearer(admin.token))).body;
    assert.equal(d.platform.professionals, 2);
    assert.equal(d.platform.sufficient, false);
    assert.match(d.platform.note, /não há dados suficientes/);
    for (let i = 0; i < 3; i++) await proIn('Volta Redonda', eletr.id);
    d = (await api().get('/api/territorial/municipalities/3306305?category=eletricista').set(bearer(admin.token))).body;
    assert.equal(d.platform.sufficient, true);
    assert.equal(d.platform.byCategory[0].count, 5);
    assert.match(d.platform.note, /não medem o mercado/i);
  });

  it('oportunidades publicadas aparecem no município; expiradas e de empresa suspensa não', async () => {
    const admin = await tokenFor('ADMIN');
    await api().post('/api/territorial/admin/sync').set(bearer(admin.token)).send({ codes: ['3306305'] });
    const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    const emp = await tokenFor('EMPRESA');
    await api().put('/api/companies/me').set(bearer(emp.token)).send({ tradeName: 'Padaria', city: 'Volta Redonda', phone: '2433334444', responsibleName: 'Carlos' });
    const o = (await api().post('/api/opportunities').set(bearer(emp.token)).send({
      title: 'Troca de fiação', description: 'Serviço de instalação elétrica na padaria.', categoryId: cat.id, city: 'Volta Redonda', mode: 'PRESENCIAL',
      deadline: new Date(Date.now() + 5 * 86400_000).toISOString(), contractType: 'PONTUAL', contactChannel: 'x@y.com',
    })).body;
    await api().post(`/api/opportunities/admin/${o.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    let d = (await api().get('/api/territorial/municipalities/3306305').set(bearer(admin.token))).body;
    assert.equal(d.platform.opportunitiesOpen, 1);
    assert.equal(d.platform.opportunities[0].title, 'Troca de fiação');
    assert.equal(d.platform.opportunities[0].contactChannel, undefined);
    await prisma.opportunity.update({ where: { id: o.id }, data: { deadline: new Date(Date.now() - 1000) } });
    d = (await api().get('/api/territorial/municipalities/3306305').set(bearer(admin.token))).body;
    assert.equal(d.platform.opportunitiesOpen, 0);
  });
});
