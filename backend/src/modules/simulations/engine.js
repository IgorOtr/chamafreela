// Motor de simulação de Monte Carlo do CHAMALÁ Insights.
// Cada iteração representa UM MÊS típico de operação, sorteando demanda, preço, custos variáveis e custos fixos
// a partir de distribuições explícitas. A receita respeita a capacidade máxima de atendimento.
// Função pura e determinística: mesmos dados + mesma semente => mesmo resultado.

export const MODEL_VERSION = 'mc-1.0.0';

export const DEFAULT_ASSUMPTIONS = {
  demandVariationPercent: 30, // coeficiente de variação da demanda (lognormal)
  priceVariationPercent: 10, // desvio relativo do ticket médio (normal)
  costVariationPercent: 10, // desvio relativo dos custos (normal)
  sensitivityPercent: 10, // choque usado na análise de sensibilidade
  horizonMonths: 12, // horizonte para o retorno do investimento
};

export const DISCLAIMER =
  'Esta simulação é uma estimativa baseada nas premissas informadas e em distribuições de probabilidade simplificadas. Não é garantia nem previsão de faturamento ou lucro, e não substitui análise contábil ou financeira profissional.';

// ---------- Números pseudoaleatórios (mulberry32) e amostragem ----------
export function createRng(seed) {
  let a = seed >>> 0;
  return function uniform() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Normal padrão (Box–Muller); consome sempre 2 uniformes por par para manter a sequência estável.
export function createNormal(uniform) {
  let spare = null;
  return function normal() {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0;
    while (u === 0) u = uniform();
    const v = uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

// Lognormal com média `mean` e coeficiente de variação `cv`, dado z ~ N(0,1).
export function lognormalFromZ(mean, cv, z) {
  if (mean <= 0) return 0;
  if (cv <= 0) return mean;
  const sigma2 = Math.log(1 + cv * cv);
  return Math.exp(Math.log(mean) - sigma2 / 2 + Math.sqrt(sigma2) * z);
}

// Percentil por interpolação linear (método R-7) em vetor ORDENADO.
export function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

// ---------- Avaliação do modelo ----------
function demandMean(i) { return i.expectedClients * i.servicesPerClient; }
export function capacityOf(i) { return Math.floor(i.workDaysPerMonth * i.servicesPerDay); }

function drawNormals(seed, n) {
  const normal = createNormal(createRng(seed));
  const z = { demand: new Float64Array(n), price: new Float64Array(n), variable: new Float64Array(n), fixed: new Float64Array(n) };
  for (let k = 0; k < n; k++) { z.demand[k] = normal(); z.price[k] = normal(); z.variable[k] = normal(); z.fixed[k] = normal(); }
  return z; // mesma sequência para todos os cenários => números aleatórios comuns (comparações estáveis)
}

// mult: choques multiplicativos aplicados às médias (sensibilidade).
function evaluate(input, a, z, mult = {}) {
  const m = { price: 1, demand: 1, variable: 1, fixed: 1, ...mult };
  const n = z.demand.length;
  const cap = capacityOf(input);
  const dMean = demandMean(input) * m.demand;
  const cvD = a.demandVariationPercent / 100, cvP = a.priceVariationPercent / 100, cvC = a.costVariationPercent / 100;
  const tax = input.taxRatePercent / 100;
  const varBase = (input.variableCostPerService + input.travelCostPerService) * m.variable;
  const profit = new Float64Array(n), revenue = new Float64Array(n), served = new Float64Array(n);
  let capacityBound = 0;
  for (let k = 0; k < n; k++) {
    const demand = Math.round(lognormalFromZ(dMean, cvD, z.demand[k]));
    const s = Math.min(demand, cap);
    if (demand > cap) capacityBound++;
    const price = Math.max(0, input.ticket * m.price * (1 + cvP * z.price[k]));
    const varCost = Math.max(0, varBase * (1 + cvC * z.variable[k]));
    const fixed = Math.max(0, input.fixedCostsMonthly * m.fixed * (1 + cvC * z.fixed[k]));
    const rev = s * price;
    revenue[k] = rev;
    served[k] = s;
    profit[k] = rev - rev * tax - input.fixedTaxMonthly - s * varCost - fixed;
  }
  return { profit, revenue, served, capacityBound };
}

const mean = (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i]; return s / arr.length; };
function stdev(arr, mu) { let s = 0; for (let i = 0; i < arr.length; i++) s += (arr[i] - mu) ** 2; return Math.sqrt(s / (arr.length - 1 || 1)); }
const sortedCopy = (arr) => Float64Array.from(arr).sort();
const probLoss = (profit) => { let c = 0; for (let i = 0; i < profit.length; i++) if (profit[i] < 0) c++; return c / profit.length; };

function histogram(sorted, bins = 30) {
  const min = sorted[0], max = sorted[sorted.length - 1];
  if (min === max) return [{ from: min, to: max, count: sorted.length }];
  const width = (max - min) / bins;
  const out = Array.from({ length: bins }, (_, b) => ({ from: min + b * width, to: min + (b + 1) * width, count: 0 }));
  for (const v of sorted) out[Math.min(bins - 1, Math.floor((v - min) / width))].count++;
  return out;
}

export function breakEven(input) {
  const tax = input.taxRatePercent / 100;
  const netPerService = input.ticket * (1 - tax) - (input.variableCostPerService + input.travelCostPerService);
  const fixedTotal = input.fixedCostsMonthly + input.fixedTaxMonthly;
  const cap = capacityOf(input);
  if (fixedTotal === 0) return { netPerService, services: 0, revenue: 0, withinCapacity: true, viable: netPerService > 0 };
  if (netPerService <= 0) return { netPerService, services: null, revenue: null, withinCapacity: false, viable: false };
  const services = fixedTotal / netPerService;
  return { netPerService, services: Math.ceil(services), revenue: Math.ceil(services) * input.ticket, withinCapacity: Math.ceil(services) <= cap, viable: true };
}

const round2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const brl = (v) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

export function runSimulation(input, { seed, iterations = 10000, assumptions = {} } = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const z = drawNormals(seed, iterations);
  const base = evaluate(input, a, z);
  const profits = sortedCopy(base.profit);
  const revenues = sortedCopy(base.revenue);
  const mu = mean(base.profit);
  const pLoss = probLoss(base.profit);
  const cap = capacityOf(input);
  const P = (p) => round2(percentile(profits, p));
  const R = (p) => round2(percentile(revenues, p));

  const percentiles = { p5: P(0.05), p10: P(0.1), p25: P(0.25), p50: P(0.5), p75: P(0.75), p90: P(0.9), p95: P(0.95) };
  const meanServed = mean(base.served);
  const summary = {
    meanProfit: round2(mu), stdProfit: round2(stdev(base.profit, mu)), minProfit: round2(profits[0]), maxProfit: round2(profits[profits.length - 1]),
    percentiles, probLoss: pLoss, probLossMarginOfError: Math.round(1.96 * Math.sqrt((pLoss * (1 - pLoss)) / iterations) * 10000) / 10000,
    meanRevenue: round2(mean(base.revenue)), meanServices: round2(meanServed), capacity: cap,
    capacityUtilization: cap > 0 ? round2(meanServed / cap) : null, probCapacityBound: base.capacityBound / iterations,
  };

  const scenarios = {
    pessimistic: { label: 'Pessimista (percentil 10)', profit: percentiles.p10, revenue: R(0.1) },
    central: { label: 'Central (mediana)', profit: percentiles.p50, revenue: R(0.5) },
    optimistic: { label: 'Otimista (percentil 90)', profit: percentiles.p90, revenue: R(0.9) },
  };

  // Retorno do investimento — só quando há investimento e o lucro típico é positivo.
  const inv = input.equipmentInvestment;
  const roi = { applicable: false, reason: null, investment: inv, horizonMonths: a.horizonMonths, paybackMonths: null, probPaybackWithinHorizon: null };
  if (inv <= 0) roi.reason = 'Sem investimento em equipamentos informado: retorno do investimento não se aplica.';
  else if (!(percentiles.p50 > 0)) roi.reason = 'O lucro mensal mediano não é positivo; o investimento não seria recuperado nas premissas informadas.';
  else {
    roi.applicable = true;
    const pb = (p) => (p > 0 ? round2(inv / p) : null);
    roi.paybackMonths = { pessimistic: pb(percentiles.p10), central: pb(percentiles.p50), optimistic: pb(percentiles.p90) };
    let ok = 0;
    for (let k = 0; k < iterations; k++) if (base.profit[k] * a.horizonMonths >= inv) ok++;
    roi.probPaybackWithinHorizon = ok / iterations;
    roi.method = 'Simplificado: investimento ÷ lucro mensal do cenário, supondo que o mês simulado se repita (sem juros nem depreciação).';
  }

  const workingCapital = input.initialCapital - inv;
  const capital = { available: input.initialCapital, workingCapitalAfterInvestment: round2(workingCapital), sufficientForInvestment: workingCapital >= 0, runwayPessimisticMonths: null };
  if (workingCapital > 0 && percentiles.p10 < 0) capital.runwayPessimisticMonths = round2(workingCapital / -percentiles.p10);

  // Sensibilidade: reexecuta com a MESMA semente, alterando cada fator em ±x%.
  const x = a.sensitivityPercent / 100;
  const factors = [['price', 'Preço (ticket médio)'], ['demand', 'Demanda'], ['variable', 'Custos variáveis'], ['fixed', 'Custos fixos']];
  const sensitivity = factors.map(([key, label]) => {
    const run = (m) => { const r = evaluate(input, a, z, { [key]: m }); return { meanProfit: round2(mean(r.profit)), probLoss: probLoss(r.profit) }; };
    const low = run(1 - x), high = run(1 + x);
    return { key, label, shiftPercent: a.sensitivityPercent, low, high, swing: round2(Math.abs(high.meanProfit - low.meanProfit)) };
  }).sort((p, q) => q.swing - p.swing);

  const be = breakEven(input);
  const warnings = [];
  const explanations = [];
  explanations.push(`Foram simulados ${iterations.toLocaleString('pt-BR')} meses possíveis. Em ${(pLoss * 100).toFixed(1).replace('.', ',')}% deles o resultado foi prejuízo (margem de erro de ±${(summary.probLossMarginOfError * 100).toFixed(1).replace('.', ',')} p.p.).`);
  explanations.push(`Em 80% dos cenários o lucro mensal ficou entre ${brl(percentiles.p10)} e ${brl(percentiles.p90)}; o valor central (mediana) foi ${brl(percentiles.p50)}.`);
  if (be.services == null) { warnings.push('Cada serviço custa mais do que rende (ticket menos impostos e custos variáveis ≤ 0): não existe ponto de equilíbrio.'); }
  else {
    explanations.push(`Para empatar no mês seria preciso atender cerca de ${be.services} serviços (${brl(be.revenue)} de receita), considerando os valores médios informados.`);
    if (!be.withinCapacity) warnings.push(`O ponto de equilíbrio (${be.services} serviços) está acima da sua capacidade de atendimento (${cap} serviços/mês).`);
  }
  if (demandMean(input) > cap) warnings.push(`A demanda esperada (${Math.round(demandMean(input))} serviços/mês) supera a capacidade (${cap}); a receita foi limitada pela capacidade.`);
  else if (summary.probCapacityBound > 0.05) explanations.push(`Em ${(summary.probCapacityBound * 100).toFixed(0)}% dos meses a demanda superou a capacidade, e a receita foi limitada a ${cap} serviços.`);
  if (!capital.sufficientForInvestment) warnings.push('O capital disponível é menor que o investimento em equipamentos informado.');
  if (capital.runwayPessimisticMonths != null) explanations.push(`No cenário pessimista, o capital restante após o investimento cobriria cerca de ${capital.runwayPessimisticMonths.toString().replace('.', ',')} mês(es) de prejuízo.`);
  if (input.taxRatePercent === 0 && input.fixedTaxMonthly === 0) warnings.push('Nenhum imposto ou encargo foi informado; o lucro pode estar superestimado.');
  if (pLoss >= 0.5) warnings.push('A probabilidade de prejuízo é de 50% ou mais nas premissas informadas.');
  if (roi.reason) explanations.push(roi.reason);
  else explanations.push(`Retorno do investimento estimado em ${roi.paybackMonths.central.toString().replace('.', ',')} mês(es) no cenário central; probabilidade de recuperar o investimento em ${a.horizonMonths} meses: ${(roi.probPaybackWithinHorizon * 100).toFixed(0)}%.`);
  explanations.push(`O fator mais sensível foi: ${sensitivity[0].label.toLowerCase()} (variar ${a.sensitivityPercent}% para mais ou para menos altera o lucro médio em ${brl(sensitivity[0].swing)}).`);

  return { summary, scenarios, breakEven: be, roi, capital, histogram: histogram(profits), sensitivity, explanations, warnings, disclaimer: DISCLAIMER };
}

// Lista de premissas exibidas ao usuário, com a ORIGEM de cada valor.
export function describeAssumptions(input, userAssumptions = {}) {
  const origin = (key) => (userAssumptions[key] !== undefined ? 'INFORMADO' : 'ESTIMADO_PADRAO');
  const a = { ...DEFAULT_ASSUMPTIONS, ...userAssumptions };
  const inf = (key, label, value, unit, note) => ({ key, label, value, unit, origin: 'INFORMADO', note });
  return [
    inf('ticket', 'Ticket médio', input.ticket, 'R$/serviço', 'Informado por você (estimativa, não dado observado).'),
    inf('expectedClients', 'Clientes por mês', input.expectedClients, 'clientes', 'Informado por você (estimativa).'),
    inf('servicesPerClient', 'Serviços por cliente/mês', input.servicesPerClient, 'serviços', 'Informado por você.'),
    inf('capacity', 'Capacidade de atendimento', capacityOf(input), 'serviços/mês', `Derivada: ${input.workDaysPerMonth} dias × ${input.servicesPerDay} serviços/dia.`),
    inf('fixedCostsMonthly', 'Custos fixos mensais', input.fixedCostsMonthly, 'R$/mês', 'Informado por você.'),
    inf('variableCostPerService', 'Custo variável por serviço', input.variableCostPerService, 'R$/serviço', 'Informado por você.'),
    inf('travelCostPerService', 'Deslocamento por serviço', input.travelCostPerService, 'R$/serviço', 'Informado por você.'),
    inf('taxRatePercent', 'Impostos sobre a receita', input.taxRatePercent, '%', input.taxRatePercent ? 'Informado por você; confirme a alíquota com seu contador.' : 'Não informado (considerado 0%).'),
    inf('fixedTaxMonthly', 'Encargos fixos mensais', input.fixedTaxMonthly, 'R$/mês', 'Informado por você.'),
    { key: 'demandVariationPercent', label: 'Variação da demanda (lognormal)', value: a.demandVariationPercent, unit: '%', origin: origin('demandVariationPercent'), note: 'Incerteza da demanda; o padrão do modelo não tem base estatística local — ajuste conforme sua experiência.' },
    { key: 'priceVariationPercent', label: 'Variação do preço (normal)', value: a.priceVariationPercent, unit: '%', origin: origin('priceVariationPercent'), note: 'Desvio relativo do ticket médio.' },
    { key: 'costVariationPercent', label: 'Variação dos custos (normal)', value: a.costVariationPercent, unit: '%', origin: origin('costVariationPercent'), note: 'Desvio relativo dos custos fixos e variáveis.' },
    { key: 'horizonMonths', label: 'Horizonte do retorno', value: a.horizonMonths, unit: 'meses', origin: origin('horizonMonths'), note: 'Usado na probabilidade de recuperar o investimento.' },
  ];
}
