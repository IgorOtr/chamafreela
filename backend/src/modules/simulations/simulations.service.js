import crypto from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { notFound } from '../../utils/errors.js';
import { normalize } from '../recommendations/matching.js';
import { DEFAULT_ASSUMPTIONS, DISCLAIMER, MODEL_VERSION, describeAssumptions, runSimulation } from './engine.js';

export const defaults = () => ({
  modelVersion: MODEL_VERSION, assumptions: DEFAULT_ASSUMPTIONS, disclaimer: DISCLAIMER,
  method: [
    'Cada iteração simula um mês típico: sorteia demanda (lognormal), preço (normal), custo variável (normal) e custo fixo (normal).',
    'Serviços atendidos = mínimo entre a demanda sorteada e a capacidade (dias × serviços por dia).',
    'Lucro = receita − impostos − serviços × custo variável − custos fixos.',
    'Os percentis 10, 50 e 90 do lucro definem os cenários pessimista, central e otimista.',
  ],
});

// Dados OBSERVADOS (IBGE) da cidade, apenas como contexto — não entram no cálculo.
async function observedContext(city) {
  if (!city) return [];
  const all = await prisma.municipality.findMany({ where: { syncedAt: { not: null } }, select: { code: true, name: true } });
  const m = all.find((x) => normalize(x.name).trim() === normalize(city).trim());
  if (!m) return [];
  const [pop, units] = await Promise.all([
    prisma.territorialIndicator.findFirst({ where: { municipalityCode: m.code, key: 'population' } }),
    prisma.territorialIndicator.findMany({ where: { municipalityCode: m.code, key: 'units_by_section', value: { not: null } } }),
  ]);
  const out = [];
  if (pop?.value != null) out.push({ label: `População de ${m.name}`, value: pop.value, unit: 'pessoas', period: pop.period, source: pop.source, origin: 'OBSERVADO', note: 'Contexto: não entra no cálculo. Dado municipal.' });
  if (units.length) out.push({ label: `Unidades locais formais em ${m.name}`, value: units.reduce((s, u) => s + u.value, 0), unit: 'unidades', period: units[0].period, source: units[0].source, origin: 'OBSERVADO', note: 'Contexto: não entra no cálculo e não mede a concorrência ativa.' });
  return out;
}

const present = (s) => ({
  id: s.id, name: s.name, city: s.city, activity: s.activity, createdAt: s.createdAt, modelVersion: s.modelVersion, seed: s.seed, iterations: s.iterations,
  inputs: s.inputs, assumptions: s.assumptions, observed: s.observed, results: s.results,
});

export async function create(user, { name, city, activity, inputs, assumptions, iterations, seed }) {
  const usedSeed = seed ?? crypto.randomInt(0, 2_147_483_647);
  const results = runSimulation(inputs, { seed: usedSeed, iterations, assumptions });
  const observed = await observedContext(city);
  const row = await prisma.simulation.create({
    data: {
      userId: user.id, name, city, activity, inputs, results, observed, assumptions: describeAssumptions(inputs, assumptions ?? {}),
      modelVersion: MODEL_VERSION, seed: usedSeed, iterations,
    },
  });
  if (!observed.length && city) results.warnings.push(`Sem dados observados (IBGE) carregados para "${city}"; todos os valores vêm das suas estimativas.`);
  return present({ ...row, results });
}

export async function list(user, { page, pageSize }) {
  const where = { userId: user.id };
  const [rows, total] = await Promise.all([
    prisma.simulation.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.simulation.count({ where }),
  ]);
  return {
    items: rows.map((s) => {
      const r = s.results;
      return { id: s.id, name: s.name, city: s.city, activity: s.activity, createdAt: s.createdAt, modelVersion: s.modelVersion, iterations: s.iterations,
        headline: { meanProfit: r.summary.meanProfit, p10: r.summary.percentiles.p10, p50: r.summary.percentiles.p50, p90: r.summary.percentiles.p90, probLoss: r.summary.probLoss, breakEvenRevenue: r.breakEven.revenue, capacity: r.summary.capacity } };
    }),
    total, page, pageSize,
  };
}

export async function get(user, id) {
  const s = await prisma.simulation.findFirst({ where: { id, userId: user.id } });
  if (!s) throw notFound('Simulação não encontrada');
  return present(s);
}

export async function remove(user, id) {
  const { count } = await prisma.simulation.deleteMany({ where: { id, userId: user.id } });
  if (!count) throw notFound('Simulação não encontrada');
}
