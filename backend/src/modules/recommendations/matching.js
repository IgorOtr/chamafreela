// Motor de correspondência do CHAMALÁ Conecta — regras e pesos configuráveis (sem aprendizado de máquina).
// Função pura: recebe profissional + oportunidade + configuração e devolve índice, detalhamento e justificativa.
// Limitação atual: sem coordenadas, a localização usa cidade/bairro (não distância em km).

export const CRITERIA = [
  { key: 'category', label: 'Categoria e serviço' },
  { key: 'location', label: 'Localização' },
  { key: 'qualifications', label: 'Qualificações' },
  { key: 'availability', label: 'Disponibilidade' },
  { key: 'mode', label: 'Modalidade de atendimento' },
  { key: 'preferences', label: 'Preferências' },
];

export const DEFAULT_CONFIG = {
  weights: { category: 30, location: 25, qualifications: 15, availability: 15, mode: 10, preferences: 5 },
  minScore: 50,
};

const STOPWORDS = new Set(['para', 'com', 'uma', 'umas', 'uns', 'dos', 'das', 'que', 'como', 'pelo', 'pela', 'mais', 'muito', 'servico', 'servicos', 'trabalho', 'preciso', 'procuro', 'realizar', 'fazer', 'geral', 'tambem', 'cada', 'entre', 'sobre', 'ate', 'seus', 'suas', 'esta', 'esse', 'essa', 'dias', 'dois']);

export const normalize = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const tokens = (s) => [...new Set(normalize(s ?? '').split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOPWORDS.has(t)))];
const tokensMatch = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && a.slice(0, 5) === b.slice(0, 5));
const overlap = (listA, listB) => listA.filter((a) => listB.some((b) => tokensMatch(a, b)));
const sameText = (a, b) => !!a && !!b && normalize(a).trim() === normalize(b).trim();

function categoryScore(pro, opp) {
  const sameCategory = pro.categoryId === opp.categoryId;
  const serviceHits = overlap(
    pro.services.flatMap((s) => tokens(s.name)),
    tokens(`${opp.title} ${opp.description}`),
  );
  if (sameCategory) {
    const v = serviceHits.length ? 1 : 0.7;
    return { value: v, detail: serviceHits.length ? `mesma categoria (${opp.category?.name ?? 'categoria'}) e serviço compatível` : `mesma categoria (${opp.category?.name ?? 'categoria'})` };
  }
  if (serviceHits.length) return { value: 0.5, detail: `serviço oferecido compatível com a demanda ("${serviceHits[0]}"), embora de outra categoria` };
  return { value: 0, detail: 'categoria e serviços incompatíveis com a demanda' };
}

function locationScore(pro, opp) {
  if (opp.mode === 'REMOTO') return { value: 1, detail: 'demanda remota: a localização não é restrição' };
  if (sameText(pro.city, opp.city)) {
    if (opp.neighborhood && sameText(pro.neighborhood, opp.neighborhood)) return { value: 1, detail: `atende no mesmo bairro (${opp.neighborhood}, ${opp.city})` };
    return { value: 0.8, detail: `atende na mesma cidade (${opp.city})` };
  }
  const area = pro.areas.find((a) => sameText(a.city, opp.city));
  if (area) {
    if (opp.neighborhood && sameText(area.neighborhood, opp.neighborhood)) return { value: 0.9, detail: `região atendida inclui ${opp.neighborhood}, ${opp.city}` };
    return { value: 0.7, detail: `${opp.city} está entre as regiões atendidas` };
  }
  return { value: 0, detail: `${opp.city} fora da cidade-base e das regiões atendidas` };
}

function qualificationsScore(pro, opp) {
  const required = tokens(opp.requirements);
  if (required.length === 0) return { value: 1, detail: 'a demanda não exige qualificações específicas' };
  const have = tokens(`${pro.qualifications ?? ''} ${pro.experience ?? ''} ${pro.description ?? ''} ${pro.services.map((s) => `${s.name} ${s.description ?? ''}`).join(' ')}`);
  const hits = overlap(required, have);
  const value = hits.length / required.length;
  return { value, detail: `${hits.length} de ${required.length} requisitos identificados no perfil` };
}

function availabilityScore(pro) {
  return pro.available ? { value: 1, detail: 'disponível para novos serviços' } : { value: 0, detail: 'sem disponibilidade informada no momento' };
}

function modeScore(pro, opp) {
  if (pro.mode === opp.mode) return { value: 1, detail: 'mesma modalidade de atendimento' };
  if (pro.mode === 'HIBRIDO') return { value: 1, detail: 'atende de forma híbrida' };
  if (opp.mode === 'HIBRIDO') return { value: 0.7, detail: 'a demanda aceita atendimento híbrido' };
  return { value: 0, detail: 'modalidade incompatível (presencial × remoto)' };
}

const CONTRACT_WORDS = { PONTUAL: 'pontual', RECORRENTE: 'recorrente', TEMPORARIO: 'temporario', VAGA_FIXA: 'fixa' };
function preferencesScore(pro, opp) {
  if (!pro.preferences?.trim()) return { value: 0.5, detail: 'sem preferências informadas (neutro)' };
  const prefs = tokens(pro.preferences);
  const target = tokens(`${opp.title} ${opp.description} ${opp.category?.name ?? ''} ${CONTRACT_WORDS[opp.contractType] ?? ''}`);
  const hits = overlap(prefs, target);
  return hits.length ? { value: 1, detail: 'alinhada às preferências informadas' } : { value: 0, detail: 'não coincide com as preferências informadas' };
}

const SCORERS = { category: categoryScore, location: locationScore, qualifications: qualificationsScore, availability: availabilityScore, mode: modeScore, preferences: preferencesScore };

export function scoreMatch(pro, opp, config = DEFAULT_CONFIG) {
  const breakdown = CRITERIA.map(({ key, label }) => {
    const { value, detail } = SCORERS[key](pro, opp);
    const weight = config.weights[key] ?? 0;
    return { key, label, weight, points: Math.round(value * weight * 10) / 10, detail };
  });
  const total = breakdown.reduce((s, b) => s + b.points, 0);
  const catCompatible = breakdown.find((b) => b.key === 'category').points > 0;
  const score = Math.round(total);
  // Porta de entrada: nunca recomenda quando categoria/serviço são incompatíveis, qualquer que seja o restante.
  const eligible = catCompatible && score >= config.minScore;
  return { score, eligible, breakdown, justification: buildJustification(breakdown, opp) };
}

function buildJustification(breakdown, opp) {
  const strong = breakdown.filter((b) => b.weight > 0 && b.points / b.weight >= 0.7).map((b) => b.detail);
  const weak = breakdown.filter((b) => b.weight > 0 && b.points / b.weight < 0.4).map((b) => b.detail);
  let text = strong.length ? `Recomendada porque: ${strong.join('; ')}.` : 'Recomendada com compatibilidade parcial.';
  if (weak.length) text += ` Pontos de atenção: ${weak.join('; ')}.`;
  const days = Math.ceil((new Date(opp.deadline) - Date.now()) / 86400_000);
  if (days >= 0 && days <= 7) text += ` Prazo próximo (${days} dia${days === 1 ? '' : 's'}).`;
  return text;
}

export function validateWeights(weights) {
  const keys = CRITERIA.map((c) => c.key);
  if (keys.some((k) => !Number.isInteger(weights?.[k]) || weights[k] < 0 || weights[k] > 100)) return 'Cada peso deve ser um inteiro entre 0 e 100';
  if (Object.keys(weights).some((k) => !keys.includes(k))) return 'Critério desconhecido';
  if (keys.reduce((s, k) => s + weights[k], 0) !== 100) return 'A soma dos pesos deve ser 100';
  return null;
}
