import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { buildCalendar } from './calendar.js';
import { checkContrast, contrastRatio, PALETTES } from './colors.js';
import { buildLogoSvg, deriveInitials } from './logo.js';
import { generateTexts, TONES, TYPES } from './texts.js';

const brief = (over = {}) => ({ businessName: 'Zé Eletricista', service: 'instalação elétrica', city: 'Volta Redonda', differentiator: 'atendimento no mesmo dia', tone: 'PROFISSIONAL', offer: 'desconto na primeira visita', deadline: 'até sexta', ...over });
const colors = PALETTES[0].colors;

describe('Studio — geradores de texto', () => {
  it('geram 3 variações distintas para cada tipo e tom, com os dados do negócio', () => {
    for (const type of Object.keys(TYPES)) for (const tone of Object.keys(TONES)) {
      const v = generateTexts(type, brief({ tone }), 11);
      assert.equal(v.length, 3, `${type}/${tone}`);
      assert.equal(new Set(v.map((x) => x.text)).size, 3, `${type}/${tone} distintas`);
      for (const x of v) {
        assert.ok(x.text.length > 20 && x.title);
        assert.ok(/Zé Eletricista|instalação elétrica/.test(x.text) || type === 'ENQUETE', `${type}/${tone} usa os dados`);
      }
    }
  });

  it('são determinísticos por semente e variam com a semente', () => {
    const a = generateTexts('LEGENDA', brief(), 5), b = generateTexts('LEGENDA', brief(), 5), c = generateTexts('LEGENDA', brief(), 6);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  });

  it('NÃO inventam fatos: nenhum número além dos informados, sem garantia, preço, anos ou certificação', () => {
    const b = brief({ differentiator: 'atendimento rápido', offer: 'condição especial para novos clientes', deadline: 'neste mês' });
    for (const type of Object.keys(TYPES)) for (const tone of Object.keys(TONES)) for (let seed = 0; seed < 5; seed++) {
      for (const x of generateTexts(type, { ...b, tone }, seed)) {
        const digits = x.text.replace(/#\S+/g, '').match(/\d+/g) ?? [];
        const allowed = type === 'ROTEIRO_VIDEO' ? ['0', '3', '4', '20'] : type === 'ENQUETE' ? ['1', '2', '3'] : [];
        assert.deepEqual(digits.filter((d) => !allowed.includes(d)), [], `${type}/${tone}: ${x.text}`);
        assert.doesNotMatch(x.text, /garanti|anos de|certificad|melhor d[eao]|R\$|100%|número 1|líder/i, `${type}: ${x.text}`);
      }
    }
  });

  it('usa o CTA informado ou o padrão do tom; inclui diferencial e hashtags sem acentos', () => {
    const t = generateTexts('LEGENDA', brief({ cta: 'Peça orçamento pelo WhatsApp.' }), 1)[0].text;
    assert.match(t, /Peça orçamento pelo WhatsApp\./);
    assert.match(t, /Nosso diferencial: atendimento no mesmo dia\./);
    assert.match(t, /#instalacaoeletrica #voltaredonda #zeeletricista/);
    assert.match(generateTexts('LEGENDA', brief({ tone: 'DESCONTRAIDO' }), 1)[0].text, /Chama a gente/);
  });

  it('sem cidade/diferencial, o texto não deixa lacunas nem "undefined"', () => {
    for (const type of Object.keys(TYPES)) for (const x of generateTexts(type, brief({ city: undefined, differentiator: undefined }), 2)) {
      assert.doesNotMatch(x.text, /undefined|null|\$\{|em  /, `${type}: ${x.text}`);
    }
  });

  it('promoção usa a oferta e o prazo informados', () => {
    const v = generateTexts('PROMOCAO', brief(), 4);
    assert.ok(v.every((x) => x.text.includes('desconto na primeira visita')));
    assert.ok(v.every((x) => x.text.includes('até sexta')));
  });
});

describe('Studio — cores e logotipo', () => {
  it('contraste WCAG: valores conhecidos', () => {
    assert.equal(contrastRatio('#000000', '#ffffff'), 21);
    assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
    assert.ok(Math.abs(contrastRatio('#777777', '#ffffff') - 4.48) < 0.02);
  });
  it('todas as paletas padrão atendem 4,5:1 em texto/fundo e branco/cor principal', () => {
    for (const p of PALETTES) {
      const r = Object.fromEntries(checkContrast(p.colors).map((c) => [c.id, c]));
      assert.ok(r.texto_fundo.ok && r.branco_primaria.ok && r.texto_secundaria.ok, p.name);
    }
  });
  it('alerta quando a combinação é ilegível', () => {
    assert.equal(checkContrast({ ...colors, primary: '#ffeb3b' }).find((c) => c.id === 'branco_primaria').ok, false);
  });

  it('logotipo SVG: estrutura válida, formas, iniciais derivadas e sem scripts', () => {
    assert.equal(deriveInitials('Zé Eletricista'), 'ZE');
    assert.equal(deriveInitials('Maria da Silva Pinturas'), 'MS');
    for (const shape of ['circulo', 'quadrado', 'escudo', 'hexagono']) {
      const svg = buildLogoSvg({ businessName: 'Zé Eletricista', shape, wordmark: true, fontKey: 'moderna', colors });
      assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
      assert.match(svg, /<\/svg>$/);
      assert.ok(svg.includes(colors.primary) && svg.includes('Zé Eletricista'));
    }
    assert.ok(!buildLogoSvg({ businessName: 'Zé Eletricista', shape: 'circulo', wordmark: false, fontKey: 'moderna', colors }).includes('Zé Eletricista</text>'));
  });

  it('logotipo escapa texto malicioso (sem XSS no SVG)', () => {
    const svg = buildLogoSvg({ businessName: '"><script>alert(1)</script><img onerror=x>', initials: '<S', shape: 'quadrado', wordmark: true, fontKey: 'forte', colors });
    assert.ok(!/<script/i.test(svg));
    assert.ok(!/<img/i.test(svg));
    assert.ok(svg.includes('&lt;script&gt;'));
  });
});

describe('Studio — calendário de conteúdo', () => {
  const cal = (over = {}, seed = 3) => buildCalendar(brief(over), { weeks: 4, postsPerWeek: 3, startDate: '2026-11-16', ...over.cfg }, seed);

  it('gera semanas × frequência, em ordem cronológica, sem domingos e sem datas repetidas', () => {
    const items = cal();
    assert.equal(items.length, 12);
    const dates = items.map((i) => i.date);
    assert.deepEqual(dates, [...dates].sort());
    assert.equal(new Set(dates).size, 12);
    assert.ok(items.every((i) => i.weekday !== 'domingo'));
    assert.equal(items[0].date, '2026-11-16'); // segunda-feira
    assert.equal(items[0].type, 'APRESENTACAO');
  });
  it('promoção só entra quando há oferta informada; depoimento nunca é inventado', () => {
    const sem = cal({ offer: undefined, deadline: undefined, cfg: { weeks: 8, postsPerWeek: 5 } });
    assert.ok(!sem.some((i) => i.type === 'PROMOCAO'));
    const com = cal({ cfg: { weeks: 8, postsPerWeek: 5 } });
    assert.ok(com.some((i) => i.type === 'PROMOCAO'));
    for (const i of com.filter((x) => x.type === 'DEPOIMENTO')) assert.match(i.draft, /autorização|permissão/i);
  });
  it('todo item tem rascunho e é determinístico por semente', () => {
    const a = cal({}, 9), b = cal({}, 9);
    assert.deepEqual(a, b);
    assert.ok(a.every((i) => i.draft.length > 20 && !/undefined/.test(i.draft)));
  });
});

describe('Studio — API', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());
  const gen = (t, b) => api().post('/api/studio/generate').set(bearer(t.token)).send(b);
  const brand = (over = {}) => ({ businessName: 'Zé Eletricista', segment: 'construcao', colors: PALETTES[1].colors, fontKey: 'moderna', logo: { shape: 'escudo', wordmark: true }, city: 'Volta Redonda', ...over });

  it('só profissionais e empresas usam o Studio; exige login', async () => {
    assert.equal((await api().get('/api/studio/options')).status, 401);
    const cli = await tokenFor('CLIENTE');
    assert.equal((await api().get('/api/studio/options').set(bearer(cli.token))).status, 403);
    for (const role of ['PROFISSIONAL', 'EMPRESA']) {
      const t = await tokenFor(role);
      assert.equal((await api().get('/api/studio/options').set(bearer(t.token))).status, 200);
    }
  });

  it('gera textos pela API (semente reproduz) e valida os campos', async () => {
    const t = await tokenFor('PROFISSIONAL');
    const a = (await gen(t, { type: 'LEGENDA', brief: brief(), seed: 77 })).body, b = (await gen(t, { type: 'LEGENDA', brief: brief(), seed: 77 })).body;
    assert.deepEqual(a.variants, b.variants);
    assert.equal(a.variants.length, 3);
    const sem = (await gen(t, { type: 'LEGENDA', brief: brief() })).body;
    assert.ok(Number.isInteger(sem.seed));
    assert.equal((await gen(t, { type: 'LEGENDA', brief: brief({ businessName: '' }) })).status, 400);
    assert.equal((await gen(t, { type: 'XPTO', brief: brief() })).status, 400);
    assert.equal((await gen(t, { type: 'PROMOCAO', brief: brief({ offer: undefined }) })).status, 400);
    assert.equal((await gen(t, { type: 'LEGENDA', brief: brief({ tone: 'AGRESSIVO' }) })).status, 400);
  });

  it('kit de marca: salva, regenera o SVG no servidor (ignora SVG do cliente) e informa contraste', async () => {
    const t = await tokenFor('PROFISSIONAL');
    assert.equal((await api().get('/api/studio/brand').set(bearer(t.token))).status, 404);
    const put = await api().put('/api/studio/brand').set(bearer(t.token)).send({ ...brand(), logoSvg: '<svg><script>alert(1)</script></svg>' });
    assert.equal(put.status, 200);
    assert.ok(put.body.logoSvg.startsWith('<svg') && !put.body.logoSvg.includes('script'));
    assert.ok(put.body.contrast.every((c) => 'ratio' in c && 'ok' in c));
    const got = (await api().get('/api/studio/brand').set(bearer(t.token))).body;
    assert.equal(got.businessName, 'Zé Eletricista');
    const again = await api().put('/api/studio/brand').set(bearer(t.token)).send(brand({ businessName: 'Zé Elétrica' }));
    assert.equal(again.body.id, put.body.id, 'um kit por usuário');
    const bad = (over) => api().put('/api/studio/brand').set(bearer(t.token)).send(brand(over));
    assert.equal((await bad({ colors: { ...PALETTES[0].colors, primary: 'vermelho' } })).status, 400);
    assert.equal((await bad({ fontKey: 'comic' })).status, 400);
    assert.equal((await bad({ logo: { shape: 'estrela', wordmark: true } })).status, 400);
    assert.equal((await bad({ logo: { shape: 'circulo', initials: '<s', wordmark: true } })).status, 400);
  });

  it('prévia de logotipo e calendário pela API', async () => {
    const t = await tokenFor('EMPRESA');
    const p = await api().post('/api/studio/logo/preview').set(bearer(t.token)).send({ businessName: 'Padaria Boa', colors, fontKey: 'elegante', logo: { shape: 'hexagono', wordmark: true } });
    assert.equal(p.status, 200);
    assert.match(p.body.svg, /^<svg/);
    const c = await api().post('/api/studio/calendar/generate').set(bearer(t.token)).send({ brief: brief(), weeks: 2, postsPerWeek: 2, startDate: '2026-11-16', seed: 1 });
    assert.equal(c.body.items.length, 4);
    assert.equal((await api().post('/api/studio/calendar/generate').set(bearer(t.token)).send({ brief: brief(), weeks: 20, postsPerWeek: 2, startDate: '2026-11-16' })).status, 400);
    assert.equal((await api().post('/api/studio/calendar/generate').set(bearer(t.token)).send({ brief: brief(), weeks: 2, postsPerWeek: 2, startDate: '16/11/2026' })).status, 400);
  });

  it('materiais salvos: criar, listar por tipo, editar, excluir; isolamento entre titulares', async () => {
    const a = await tokenFor('PROFISSIONAL'), b = await tokenFor('PROFISSIONAL');
    const post = (t, body) => api().post('/api/studio/assets').set(bearer(t.token)).send(body);
    const l = await post(a, { type: 'LEGENDA', title: 'Legenda 1', content: 'Texto' });
    assert.equal(l.status, 201);
    await post(a, { type: 'CALENDARIO', title: 'Plano', data: { items: [{ date: '2026-11-16' }] } });
    assert.equal((await api().get('/api/studio/assets').set(bearer(a.token))).body.length, 2);
    assert.equal((await api().get('/api/studio/assets?type=CALENDARIO').set(bearer(a.token))).body.length, 1);
    assert.equal((await api().get('/api/studio/assets').set(bearer(b.token))).body.length, 0);
    assert.equal((await api().patch(`/api/studio/assets/${l.body.id}`).set(bearer(b.token)).send({ title: 'x' })).status, 404);
    assert.equal((await api().delete(`/api/studio/assets/${l.body.id}`).set(bearer(b.token))).status, 404);
    const up = await api().patch(`/api/studio/assets/${l.body.id}`).set(bearer(a.token)).send({ content: 'Editado' });
    assert.equal(up.body.content, 'Editado');
    assert.equal((await api().delete(`/api/studio/assets/${l.body.id}`).set(bearer(a.token))).status, 204);
    assert.equal((await post(a, { type: 'INVALIDO', title: 'x' })).status, 400);
    assert.equal((await post(a, { type: 'LEGENDA', title: '' })).status, 400);
    assert.equal((await post(a, { type: 'POST', title: 'Grande', data: { x: 'a'.repeat(70_000) } })).status, 400);
  });
});
