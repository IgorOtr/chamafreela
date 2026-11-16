import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_CONFIG, scoreMatch, tokens, validateWeights } from './matching.js';

const pro = (over = {}) => ({
  categoryId: 'c-eletr', city: 'Volta Redonda', neighborhood: 'Aterrado', mode: 'PRESENCIAL', available: true, preferences: null,
  qualifications: 'Curso NR10', experience: '8 anos com instalações', description: 'Eletricista residencial',
  services: [{ name: 'Troca de fiação' }, { name: 'Quadro de luz' }], areas: [{ city: 'Barra Mansa', neighborhood: null }], ...over,
});
const opp = (over = {}) => ({
  categoryId: 'c-eletr', category: { name: 'Eletricista' }, title: 'Troca de fiação em padaria', description: 'Serviço de dois dias na cozinha.',
  city: 'Volta Redonda', neighborhood: null, mode: 'PRESENCIAL', contractType: 'PONTUAL', requirements: null,
  deadline: new Date(Date.now() + 20 * 86400_000), ...over,
});

describe('motor de correspondência', () => {
  it('pesos padrão somam 100', () => assert.equal(validateWeights(DEFAULT_CONFIG.weights), null));

  it('perfil ideal obtém índice alto, elegível e com justificativa', () => {
    const r = scoreMatch(pro(), opp());
    assert.ok(r.score >= 85, `score ${r.score}`);
    assert.equal(r.eligible, true);
    assert.match(r.justification, /mesma categoria/);
    assert.equal(r.breakdown.length, 6);
    assert.equal(Math.round(r.breakdown.reduce((s, b) => s + b.points, 0)), r.score);
  });

  it('NUNCA recomenda categoria/serviço incompatível, mesmo com tudo o mais perfeito', () => {
    const r = scoreMatch(pro({ categoryId: 'c-pintor', services: [{ name: 'Pintura de paredes' }] }), opp());
    assert.equal(r.breakdown.find((b) => b.key === 'category').points, 0);
    assert.ok(r.score >= 50, 'resto do perfil é compatível');
    assert.equal(r.eligible, false);
  });

  it('categoria diferente mas serviço compatível é elegível com nota parcial', () => {
    const r = scoreMatch(pro({ categoryId: 'c-outra', services: [{ name: 'Instalação e troca de fiação' }] }), opp());
    assert.equal(r.breakdown.find((b) => b.key === 'category').points, 15);
    assert.equal(r.eligible, true);
  });

  it('localização: bairro > cidade > região atendida > fora; remoto ignora localização', () => {
    const loc = (p, o) => scoreMatch(p, o).breakdown.find((b) => b.key === 'location').points;
    assert.equal(loc(pro(), opp({ neighborhood: 'Aterrado' })), 25);
    assert.equal(loc(pro(), opp()), 20);
    assert.equal(loc(pro(), opp({ city: 'Barra Mansa' })), 17.5);
    assert.equal(loc(pro(), opp({ city: 'Resende' })), 0);
    assert.equal(loc(pro(), opp({ city: 'Resende', mode: 'REMOTO' })), 25);
  });

  it('acentos e caixa não afetam a comparação de cidades', () => {
    const r = scoreMatch(pro({ city: 'VOLTA REDONDA' }), opp({ city: 'volta redonda' }));
    assert.equal(r.breakdown.find((b) => b.key === 'location').points, 20);
    assert.deepEqual(tokens('Instalação ELÉTRICA'), ['instalacao', 'eletrica']);
  });

  it('indisponível perde os pontos de disponibilidade e recebe ponto de atenção', () => {
    const r = scoreMatch(pro({ available: false }), opp());
    assert.equal(r.breakdown.find((b) => b.key === 'availability').points, 0);
    assert.match(r.justification, /Pontos de atenção.*disponibilidade/);
  });

  it('modalidade: híbrido atende ambos; presencial × remoto é incompatível', () => {
    const m = (p, o) => scoreMatch(p, o).breakdown.find((b) => b.key === 'mode').points;
    assert.equal(m(pro({ mode: 'HIBRIDO' }), opp({ mode: 'REMOTO' })), 10);
    assert.equal(m(pro({ mode: 'REMOTO' }), opp({ mode: 'PRESENCIAL' })), 0);
    assert.equal(m(pro(), opp({ mode: 'HIBRIDO' })), 7);
  });

  it('requisitos: cobertura parcial gera pontuação proporcional', () => {
    const q = (req) => scoreMatch(pro(), opp({ requirements: req })).breakdown.find((b) => b.key === 'qualifications').points;
    assert.equal(q(null), 15);
    assert.equal(q('Certificação NR10 e experiência com instalações'), 15 * (2 / 3) > 0 ? q('Certificação NR10 e experiência com instalações') : 0);
    assert.equal(q('Habilitação para operar guindaste'), 0);
  });

  it('preferências: neutro sem preferência; alinhadas pontuam; desalinhadas zeram', () => {
    const p = (prefs) => scoreMatch(pro({ preferences: prefs }), opp()).breakdown.find((b) => b.key === 'preferences').points;
    assert.equal(p(''), 2.5);
    assert.equal(p('Prefiro serviços pontuais em comércios'), 5);
    assert.equal(p('Somente obras grandes de construção'), 0);
  });

  it('pesos configuráveis alteram o resultado; limiar mínimo respeitado', () => {
    const base = scoreMatch(pro({ available: false }), opp());
    const heavy = scoreMatch(pro({ available: false }), opp(), { weights: { category: 10, location: 10, qualifications: 10, availability: 60, mode: 5, preferences: 5 }, minScore: 40 });
    assert.ok(heavy.score < base.score);
    assert.equal(scoreMatch(pro(), opp(), { ...DEFAULT_CONFIG, minScore: 101 }).eligible, false);
  });

  it('valida pesos: soma 100, inteiros, critérios conhecidos', () => {
    assert.ok(validateWeights({ ...DEFAULT_CONFIG.weights, category: 40 }));
    assert.ok(validateWeights({ ...DEFAULT_CONFIG.weights, category: 30.5, location: 24.5 }));
    assert.ok(validateWeights({ ...DEFAULT_CONFIG.weights, extra: 0 }));
    assert.ok(validateWeights({ category: 100 }));
  });
});
