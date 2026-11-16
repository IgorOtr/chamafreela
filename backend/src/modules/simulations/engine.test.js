import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { breakEven, capacityOf, createNormal, createRng, lognormalFromZ, percentile, runSimulation } from './engine.js';

const base = {
  ticket: 100, expectedClients: 40, servicesPerClient: 1, workDaysPerMonth: 20, servicesPerDay: 5,
  fixedCostsMonthly: 1000, variableCostPerService: 20, travelCostPerService: 5, taxRatePercent: 10, fixedTaxMonthly: 50,
  equipmentInvestment: 2000, initialCapital: 5000,
};
const noVar = { demandVariationPercent: 0, priceVariationPercent: 0, costVariationPercent: 0 };
const run = (over = {}, opts = {}) => runSimulation({ ...base, ...over }, { seed: 7, iterations: 5000, ...opts });

describe('gerador pseudoaleatório', () => {
  it('é determinístico: mesma semente => mesma sequência; sementes diferentes divergem', () => {
    const a = createRng(123), b = createRng(123), c = createRng(124);
    const sa = Array.from({ length: 5 }, a), sb = Array.from({ length: 5 }, b), sc = Array.from({ length: 5 }, c);
    assert.deepEqual(sa, sb);
    assert.notDeepEqual(sa, sc);
  });

  it('uniforme em [0,1) com média ≈ 0,5 e variância ≈ 1/12', () => {
    const u = createRng(1); const n = 200000; let s = 0, s2 = 0;
    for (let i = 0; i < n; i++) { const v = u(); assert.ok(v >= 0 && v < 1); s += v; s2 += v * v; }
    assert.ok(Math.abs(s / n - 0.5) < 0.005);
    assert.ok(Math.abs(s2 / n - (s / n) ** 2 - 1 / 12) < 0.003);
  });

  it('normal padrão: média ≈ 0, desvio ≈ 1, ~68% dentro de 1 desvio', () => {
    const z = createNormal(createRng(99)); const n = 200000; let s = 0, s2 = 0, within = 0;
    for (let i = 0; i < n; i++) { const v = z(); s += v; s2 += v * v; if (Math.abs(v) < 1) within++; }
    assert.ok(Math.abs(s / n) < 0.01);
    assert.ok(Math.abs(Math.sqrt(s2 / n) - 1) < 0.01);
    assert.ok(Math.abs(within / n - 0.6827) < 0.005);
  });

  it('lognormal: média amostral ≈ média alvo, sempre positiva, CV ≈ alvo', () => {
    const z = createNormal(createRng(5)); const n = 300000; let s = 0, s2 = 0;
    for (let i = 0; i < n; i++) { const v = lognormalFromZ(50, 0.3, z()); assert.ok(v > 0); s += v; s2 += v * v; }
    const m = s / n, sd = Math.sqrt(s2 / n - m * m);
    assert.ok(Math.abs(m - 50) / 50 < 0.01, `média ${m}`);
    assert.ok(Math.abs(sd / m - 0.3) < 0.01, `cv ${sd / m}`);
    assert.equal(lognormalFromZ(50, 0, 3), 50);
    assert.equal(lognormalFromZ(0, 0.3, 1), 0);
  });
});

describe('percentis', () => {
  it('interpolação linear (R-7) em casos conhecidos', () => {
    const v = [10, 20, 30, 40, 50];
    assert.equal(percentile(v, 0), 10);
    assert.equal(percentile(v, 0.5), 30);
    assert.equal(percentile(v, 1), 50);
    assert.equal(percentile(v, 0.25), 20);
    assert.equal(percentile(v, 0.1), 14);
    assert.equal(percentile([7], 0.9), 7);
    assert.equal(percentile([], 0.5), null);
  });
});

describe('modelo financeiro', () => {
  it('sem incerteza, o resultado é exatamente a fórmula: Receita − impostos − custos variáveis − custos fixos', () => {
    const r = run({}, { assumptions: noVar });
    const served = 40, revenue = served * 100;
    const expected = revenue - revenue * 0.1 - 50 - served * (20 + 5) - 1000; // 4000 − 400 − 50 − 1000 − 1000 = 1550
    assert.equal(expected, 1550);
    assert.equal(r.summary.meanProfit, 1550);
    assert.equal(r.summary.stdProfit, 0);
    assert.equal(r.summary.percentiles.p10, 1550);
    assert.equal(r.summary.percentiles.p90, 1550);
    assert.equal(r.summary.probLoss, 0);
    assert.equal(r.summary.meanRevenue, 4000);
  });

  it('capacidade máxima limita a receita: nunca atende nem fatura além da capacidade', () => {
    const cap = capacityOf(base); // 100
    assert.equal(cap, 100);
    const r = run({ expectedClients: 1000 }, { assumptions: { ...noVar, demandVariationPercent: 0 } });
    assert.equal(r.summary.meanServices, cap);
    assert.equal(r.summary.meanRevenue, cap * base.ticket);
    assert.equal(r.summary.probCapacityBound, 1);
    assert.ok(r.warnings.some((w) => /capacidade/.test(w)));
    // com variação, nenhum cenário passa do teto
    const v = run({ expectedClients: 150 });
    assert.ok(v.scenarios.optimistic.revenue <= cap * base.ticket * 1.5, 'teto + variação de preço');
    assert.ok(v.summary.meanServices <= cap);
  });

  it('média simulada converge para a esperança analítica (sem teto de capacidade)', () => {
    const r = runSimulation({ ...base, workDaysPerMonth: 30, servicesPerDay: 100 }, { seed: 2024, iterations: 50000 });
    const analytic = 40 * 100 * 0.9 - 40 * 25 - 1000 - 50; // E[D]·E[P]·(1−t) − E[D]·E[C] − E[F] − imposto fixo
    assert.ok(Math.abs(r.summary.meanProfit - analytic) / analytic < 0.02, `${r.summary.meanProfit} vs ${analytic}`);
  });

  it('probabilidade de prejuízo: ~0 com folga grande e ~1 com custos muito acima da receita', () => {
    assert.ok(run({ fixedCostsMonthly: 100 }).summary.probLoss < 0.01);
    assert.ok(run({ fixedCostsMonthly: 20000 }).summary.probLoss > 0.99);
  });

  it('percentis são monótonos e o histograma soma o número de iterações', () => {
    const r = run();
    const p = r.summary.percentiles;
    const seq = [p.p5, p.p10, p.p25, p.p50, p.p75, p.p90, p.p95];
    for (let i = 1; i < seq.length; i++) assert.ok(seq[i] >= seq[i - 1]);
    assert.ok(r.summary.minProfit <= p.p5 && r.summary.maxProfit >= p.p95);
    assert.equal(r.histogram.reduce((s, b) => s + b.count, 0), 5000);
    assert.ok(r.scenarios.pessimistic.profit <= r.scenarios.central.profit && r.scenarios.central.profit <= r.scenarios.optimistic.profit);
  });

  it('reprodutibilidade: mesma semente => resultado idêntico; semente diferente => resultado diferente', () => {
    const a = run({}, { seed: 555 }), b = run({}, { seed: 555 }), c = run({}, { seed: 556 });
    assert.deepEqual(a, b);
    assert.notEqual(a.summary.meanProfit, c.summary.meanProfit);
  });

  it('mais iterações reduzem o erro: resultados com sementes diferentes ficam mais próximos', () => {
    const spread = (n) => { const m = [1, 2, 3, 4, 5, 6].map((seed) => runSimulation(base, { seed, iterations: n }).summary.meanProfit); return Math.max(...m) - Math.min(...m); };
    assert.ok(spread(40000) < spread(1000));
  });
});

describe('ponto de equilíbrio', () => {
  it('fórmula analítica: custos fixos ÷ margem líquida por serviço', () => {
    const be = breakEven(base); // margem = 100·0,9 − 25 = 65; fixo = 1050 → 16,15 → 17 serviços
    assert.equal(be.netPerService, 65);
    assert.equal(be.services, 17);
    assert.equal(be.revenue, 1700);
    assert.equal(be.withinCapacity, true);
  });
  it('inviável quando cada serviço custa mais do que rende; fora da capacidade quando exige mais que o máximo', () => {
    const bad = breakEven({ ...base, variableCostPerService: 95 });
    assert.equal(bad.viable, false);
    assert.equal(bad.services, null);
    assert.equal(breakEven({ ...base, fixedCostsMonthly: 100000 }).withinCapacity, false);
    assert.equal(breakEven({ ...base, fixedCostsMonthly: 0, fixedTaxMonthly: 0 }).services, 0);
  });
  it('lucro nulo exatamente no ponto de equilíbrio determinístico', () => {
    const be = breakEven(base);
    const r = runSimulation({ ...base, expectedClients: be.services }, { seed: 1, iterations: 1000, assumptions: noVar });
    assert.ok(r.summary.meanProfit >= 0 && r.summary.meanProfit < 65, `lucro ${r.summary.meanProfit}`);
    const below = runSimulation({ ...base, expectedClients: be.services - 1 }, { seed: 1, iterations: 1000, assumptions: noVar });
    assert.ok(below.summary.meanProfit < 0);
  });
});

describe('sensibilidade, retorno e capital', () => {
  it('direção correta: preço e demanda maiores aumentam o lucro; custos maiores o reduzem', () => {
    const s = Object.fromEntries(run().sensitivity.map((x) => [x.key, x]));
    assert.ok(s.price.high.meanProfit > s.price.low.meanProfit);
    assert.ok(s.demand.high.meanProfit > s.demand.low.meanProfit);
    assert.ok(s.variable.high.meanProfit < s.variable.low.meanProfit);
    assert.ok(s.fixed.high.meanProfit < s.fixed.low.meanProfit);
    assert.ok(s.price.high.probLoss <= s.price.low.probLoss);
    const swings = run().sensitivity.map((x) => x.swing);
    assert.deepEqual(swings, [...swings].sort((a, b) => b - a));
  });

  it('sensibilidade de preço bate com a fórmula analítica (sem incerteza): ±10% de receita líquida', () => {
    const r = run({}, { assumptions: noVar });
    const price = r.sensitivity.find((x) => x.key === 'price');
    assert.equal(price.high.meanProfit - price.low.meanProfit, 2 * 0.1 * 4000 * 0.9);
  });

  it('retorno do investimento só se aplica com investimento e lucro mediano positivo', () => {
    const ok = run({}, { assumptions: noVar });
    assert.equal(ok.roi.applicable, true);
    assert.equal(ok.roi.paybackMonths.central, Math.round((2000 / 1550) * 100) / 100);
    assert.equal(ok.roi.probPaybackWithinHorizon, 1);
    assert.equal(run({ equipmentInvestment: 0 }).roi.applicable, false);
    const neg = run({ fixedCostsMonthly: 20000 });
    assert.equal(neg.roi.applicable, false);
    assert.match(neg.roi.reason, /não é positivo/);
  });

  it('capital: alerta quando menor que o investimento e calcula fôlego no cenário pessimista', () => {
    assert.ok(run({ initialCapital: 1000 }).warnings.some((w) => /capital/i.test(w)));
    const r = run({ fixedCostsMonthly: 3000, initialCapital: 10000 }, { assumptions: noVar });
    assert.equal(r.capital.workingCapitalAfterInvestment, 8000);
    assert.equal(r.capital.runwayPessimisticMonths, Math.round((8000 / (-r.summary.percentiles.p10)) * 100) / 100);
  });

  it('avisos honestos: sem impostos informados e disclaimer sempre presente', () => {
    const r = run({ taxRatePercent: 0, fixedTaxMonthly: 0 });
    assert.ok(r.warnings.some((w) => /imposto/i.test(w)));
    assert.match(r.disclaimer, /Não é garantia/);
    assert.ok(r.explanations.length >= 4);
  });
});
