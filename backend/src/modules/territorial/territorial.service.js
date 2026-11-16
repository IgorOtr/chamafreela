import { ibge as realIbge } from '../../integrations/ibge.js';
import { prisma } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import * as audit from '../audit/audit.service.js';
import { normalize } from '../recommendations/matching.js';
import { geometryCenter } from './geo.js';
import { CEMPRE, INDICATORS, STRUCTURAL_NOTES } from './indicators.js';

// Municípios iniciais: Volta Redonda e Sul Fluminense (códigos IBGE).
export const SUL_FLUMINENSE = ['3306305', '3300407', '3303955', '3304003', '3304201', '3304110', '3304128', '3302254'];
const MIN_PROFESSIONALS_FOR_PLATFORM_ANALYSIS = 5;

let ibge = realIbge;
export const setIbgeClient = (client) => { ibge = client ?? realIbge; }; // injeção para testes

const visibleOpp = () => ({ status: 'PUBLICADA', deadline: { gte: new Date() }, company: { status: 'ATIVA' } });

// ---- Sincronização com o IBGE (administração). Falha de um indicador não derruba os demais.
async function saveIndicator(code, { key, dimension = '', dimensionLabel = null, value, period }, meta) {
  const data = { label: meta.label, value, unit: meta.unit, source: meta.source, sourceUrl: meta.sourceUrl, methodology: meta.methodology, limitations: meta.limitations, dimensionLabel, fetchedAt: new Date() };
  await prisma.territorialIndicator.upsert({
    where: { municipalityCode_key_dimension_period: { municipalityCode: code, key, dimension, period } },
    update: data, create: { ...data, municipalityCode: code, key, dimension, period },
  });
}

export async function syncMunicipality(code) {
  const report = { code, name: null, ok: [], failed: [] };
  const step = async (name, fn) => { try { await fn(); report.ok.push(name); } catch (e) { report.failed.push({ indicador: name, erro: e.message }); } };

  const info = await ibge.fetchMunicipality(code);
  report.name = info.name;
  await prisma.municipality.upsert({ where: { code }, update: { name: info.name, uf: info.uf }, create: { code, name: info.name, uf: info.uf } });

  await step('geometria', async () => {
    const geojson = await ibge.fetchGeometry(code);
    const c = geometryCenter(geojson);
    await prisma.municipality.update({ where: { code }, data: { geojson, centerLat: c?.lat ?? null, centerLng: c?.lng ?? null } });
  });
  await step('censo', async () => {
    const c = await ibge.fetchCensus(code);
    for (const key of ['population', 'area', 'density']) await saveIndicator(code, { key, value: c[key], period: c.period }, INDICATORS[key]);
  });
  await step('pib', async () => {
    const p = await ibge.fetchPib(code);
    await saveIndicator(code, { key: 'pib', value: p.value, period: p.period }, INDICATORS.pib);
  });
  await step('cempre', async () => {
    const { sections, period } = await ibge.fetchCempreSections(code);
    for (const s of sections) {
      await saveIndicator(code, { key: CEMPRE.units.key, dimension: s.code, dimensionLabel: s.label, value: s.units, period }, CEMPRE.units);
      await saveIndicator(code, { key: CEMPRE.workers.key, dimension: s.code, dimensionLabel: s.label, value: s.workers, period }, CEMPRE.workers);
    }
  });
  await prisma.municipality.update({ where: { code }, data: { syncedAt: new Date() } });
  return report;
}

export async function sync(actor, codes, ip) {
  const list = codes?.length ? codes : SUL_FLUMINENSE;
  const reports = [];
  for (const code of list) {
    try { reports.push(await syncMunicipality(code)); } catch (e) { reports.push({ code, name: null, ok: [], failed: [{ indicador: 'município', erro: e.message }] }); }
  }
  await audit.record({ actorId: actor.id, action: 'TERRITORIAL_SYNC', entity: 'Municipality', ip, changes: { municipios: reports.map((r) => ({ code: r.code, ok: r.ok.length, falhas: r.failed.length })) } });
  return reports;
}

// ---- Leitura
async function categoryFilter(slug) {
  if (!slug) return null;
  const c = await prisma.category.findUnique({ where: { slug } });
  if (!c) throw badRequest('Categoria desconhecida');
  return c;
}

async function platformCounts(category) {
  const proWhere = { status: 'APROVADO', ...(category && { categoryId: category.id }) };
  const [pros, areas, opps] = await Promise.all([
    prisma.professional.groupBy({ by: ['city'], where: proWhere, _count: { _all: true } }),
    prisma.serviceArea.groupBy({ by: ['city'], where: { professional: proWhere }, _count: { _all: true } }),
    prisma.opportunity.groupBy({ by: ['city'], where: { ...visibleOpp(), ...(category && { categoryId: category.id }) }, _count: { _all: true } }),
  ]);
  const fold = (rows) => rows.reduce((acc, r) => { const k = normalize(r.city).trim(); acc[k] = (acc[k] ?? 0) + r._count._all; return acc; }, {});
  return { professionals: fold(pros), areas: fold(areas), opportunities: fold(opps) };
}

export async function listMunicipalities() {
  const rows = await prisma.municipality.findMany({ where: { syncedAt: { not: null } }, orderBy: { name: 'asc' }, select: { code: true, name: true, uf: true, centerLat: true, centerLng: true, syncedAt: true } });
  return rows;
}

export async function overview({ category }) {
  const cat = await categoryFilter(category);
  const [municipalities, counts] = await Promise.all([listMunicipalities(), platformCounts(cat)]);
  const populations = await prisma.territorialIndicator.findMany({ where: { key: 'population' }, select: { municipalityCode: true, value: true, period: true } });
  return {
    category: cat ? { slug: cat.slug, name: cat.name } : null,
    items: municipalities.map((m) => {
      const k = normalize(m.name).trim();
      const pop = populations.find((p) => p.municipalityCode === m.code);
      return {
        ...m, population: pop?.value ?? null, populationPeriod: pop?.period ?? null,
        professionals: counts.professionals[k] ?? 0, areasServed: counts.areas[k] ?? 0, opportunities: counts.opportunities[k] ?? 0,
      };
    }),
    // Cidades com profissionais/oportunidades na plataforma mas sem dados territoriais sincronizados.
    unmapped: Object.keys({ ...counts.professionals, ...counts.opportunities }).filter((k) => !municipalities.some((m) => normalize(m.name).trim() === k)),
  };
}

export async function detail(code, { category }) {
  const m = await prisma.municipality.findUnique({ where: { code } });
  if (!m || !m.syncedAt) throw notFound('Município sem dados territoriais. Peça à administração para sincronizar com o IBGE.');
  const cat = await categoryFilter(category);
  const rows = await prisma.territorialIndicator.findMany({ where: { municipalityCode: code } });
  const pick = (r) => ({ key: r.key, label: r.label, value: r.value, unit: r.unit, period: r.period, source: r.source, sourceUrl: r.sourceUrl, scale: r.scale, methodology: r.methodology, limitations: r.limitations, fetchedAt: r.fetchedAt });

  const indicators = Object.keys(INDICATORS).map((key) => rows.find((r) => r.key === key)).filter(Boolean).map(pick);
  const gaps = Object.entries(INDICATORS).filter(([key]) => !rows.some((r) => r.key === key)).map(([, meta]) => `${meta.label}: dado não obtido do IBGE para este município (não sincronizado ou indisponível).`);

  const unitsRows = rows.filter((r) => r.key === CEMPRE.units.key);
  const sectors = unitsRows.map((u) => {
    const w = rows.find((r) => r.key === CEMPRE.workers.key && r.dimension === u.dimension);
    return { code: u.dimension, label: u.dimensionLabel, units: u.value, workers: w?.value ?? null };
  }).sort((a, b) => (b.units ?? -1) - (a.units ?? -1));
  const sectorMeta = unitsRows[0] ? { period: unitsRows[0].period, source: CEMPRE.units.source, sourceUrl: CEMPRE.units.sourceUrl, scale: 'Município', unit: 'unidades locais / pessoas', methodology: CEMPRE.units.methodology, limitations: CEMPRE.units.limitations } : null;
  if (!sectorMeta) gaps.push('Estabelecimentos por setor (CEMPRE): dado não obtido do IBGE para este município.');
  else if (sectors.some((s) => s.units == null || s.workers == null)) gaps.push('Alguns setores têm dados omitidos pelo IBGE (sigilo estatístico) e aparecem como indisponíveis.');

  const k = normalize(m.name).trim();
  const counts = await platformCounts(cat);
  const proWhere = { status: 'APROVADO', ...(cat && { categoryId: cat.id }) };
  const [byCategory, opportunities] = await Promise.all([
    prisma.professional.groupBy({ by: ['categoryId'], where: { ...proWhere, city: { equals: m.name, mode: 'insensitive' } }, _count: { _all: true } }),
    prisma.opportunity.findMany({
      where: { ...visibleOpp(), city: { equals: m.name, mode: 'insensitive' }, ...(cat && { categoryId: cat.id }) },
      orderBy: { publishedAt: 'desc' }, take: 5, select: { id: true, title: true, category: { select: { name: true } }, company: { select: { tradeName: true } } },
    }),
  ]);
  const catNames = await prisma.category.findMany({ where: { id: { in: byCategory.map((b) => b.categoryId) } }, select: { id: true, name: true, slug: true } });
  const professionals = counts.professionals[k] ?? 0;
  const sufficient = professionals >= MIN_PROFESSIONALS_FOR_PLATFORM_ANALYSIS;

  return {
    municipality: { code: m.code, name: m.name, uf: m.uf, centerLat: m.centerLat, centerLng: m.centerLng, syncedAt: m.syncedAt },
    geometry: m.geojson,
    category: cat ? { slug: cat.slug, name: cat.name } : null,
    indicators,
    sectors: { meta: sectorMeta, items: sectors },
    platform: {
      professionals, areasServed: counts.areas[k] ?? 0, opportunitiesOpen: counts.opportunities[k] ?? 0,
      byCategory: byCategory.map((b) => ({ ...catNames.find((c) => c.id === b.categoryId), count: b._count._all })).sort((a, b) => b.count - a.count),
      opportunities,
      sufficient,
      note: sufficient
        ? 'Contagens do cadastro da plataforma (cidade informada pelos profissionais). Não medem o mercado nem a concorrência real.'
        : `Poucos profissionais cadastrados nesta região (menos de ${MIN_PROFESSIONALS_FOR_PLATFORM_ANALYSIS}): não há dados suficientes da plataforma para comparações.`,
    },
    gaps,
    notes: STRUCTURAL_NOTES,
  };
}
