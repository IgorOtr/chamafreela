// Cliente das APIs públicas do IBGE (sem chave, gratuitas). Toda requisição tem timeout.
const BASE = 'https://servicodados.ibge.gov.br/api';
const TIMEOUT_MS = 30_000;

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`IBGE respondeu ${res.status} para ${url}`);
  return res.json();
}

// Convenções do IBGE: "-" = zero (não ocorreu), "X" = dado omitido (sigilo), ".." / "..." = não disponível.
export function parseValue(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === '') return null;
  if (t === '-') return 0;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const firstSeries = (variable) => variable.resultados?.[0]?.series?.[0]?.serie ?? {};

export async function fetchMunicipality(code) {
  const m = await getJson(`${BASE}/v1/localidades/municipios/${code}`);
  return { code: String(m.id), name: m.nome, uf: m.microrregiao?.mesorregiao?.UF?.sigla ?? 'RJ' };
}

export async function fetchGeometry(code) {
  return getJson(`${BASE}/v3/malhas/municipios/${code}?formato=application/vnd.geo+json&qualidade=intermediaria`);
}

// Censo Demográfico 2022 — tabela 4714: população (93), área (6318) e densidade (614).
export async function fetchCensus(code) {
  const data = await getJson(`${BASE}/v3/agregados/4714/periodos/2022/variaveis/93|6318|614?localidades=N6[${code}]`);
  const out = {};
  for (const v of data) out[v.id] = parseValue(firstSeries(v)['2022']);
  return { population: out['93'], area: out['6318'], density: out['614'], period: '2022' };
}

// PIB dos Municípios — tabela 5938, variável 37 (Mil Reais), último ano divulgado.
export async function fetchPib(code) {
  const data = await getJson(`${BASE}/v3/agregados/5938/periodos/-1/variaveis/37?localidades=N6[${code}]`);
  const serie = firstSeries(data[0]);
  const period = Object.keys(serie)[0];
  return { value: parseValue(serie[period]), period };
}

// CEMPRE — tabela 6450 (CNAE 2.0, série encerrada em 2021): unidades locais (706) e pessoal ocupado (707) por seção.
export const CEMPRE_YEAR = '2021';
export async function fetchCempreSections(code) {
  const data = await getJson(`${BASE}/v3/agregados/6450/periodos/${CEMPRE_YEAR}/variaveis/706|707?localidades=N6[${code}]&classificacao=12762[allxt]`);
  const sections = new Map();
  for (const variable of data) {
    for (const r of variable.resultados) {
      const name = Object.values(r.classificacoes[0].categoria)[0];
      const m = /^([A-U])\s+(.+)$/.exec(name); // seções começam com letra; divisões/classes começam com dígito
      if (!m) continue;
      const entry = sections.get(m[1]) ?? { code: m[1], label: m[2], units: null, workers: null };
      const value = parseValue(r.series[0].serie[CEMPRE_YEAR]);
      if (variable.id === '706') entry.units = value; else entry.workers = value;
      sections.set(m[1], entry);
    }
  }
  return { sections: [...sections.values()], period: CEMPRE_YEAR };
}

export const ibge = { fetchMunicipality, fetchGeometry, fetchCensus, fetchPib, fetchCempreSections };
