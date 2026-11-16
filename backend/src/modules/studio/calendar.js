// Plano de conteúdo: distribui tipos de post ao longo das semanas e entrega rascunhos/roteiros de apoio.
// Os rascunhos são ORIENTAÇÕES ou textos feitos só com dados informados — nunca dicas técnicas, depoimentos ou resultados inventados.
import { createRng } from '../simulations/engine.js';
import { ctaOf, generateTexts, hashtags, shuffle } from './texts.js';

export const POST_TYPES = {
  APRESENTACAO: 'Apresentação',
  DICA: 'Dica',
  BASTIDORES: 'Bastidores',
  PROMOCAO: 'Promoção',
  DEPOIMENTO: 'Depoimento de cliente',
  ENQUETE: 'Enquete',
  ANTES_DEPOIS: 'Antes e depois',
};

// Dias da semana (0=domingo) por frequência semanal; domingo é evitado.
const DAYS = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
const WEEKDAY = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function draft(type, b, rng, seed) {
  const cta = ctaOf(b);
  const tags = hashtags(b);
  switch (type) {
    case 'APRESENTACAO': return generateTexts('APRESENTACAO', b, seed)[0].text;
    case 'DICA': return `Compartilhe uma dica prática sobre ${b.service} que seus clientes costumam perguntar.\nEstrutura sugerida: 1) o problema comum; 2) a solução em um passo; 3) convite: ${cta}\n${tags}`;
    case 'BASTIDORES': return `Mostre um momento real do seu trabalho hoje (ferramentas, preparação ou o serviço em andamento) e conte em uma frase o que está fazendo.\nFechamento: ${cta}\n${tags}`;
    case 'PROMOCAO': return b.offer ? generateTexts('PROMOCAO', b, seed)[0].text : `Defina uma oferta real (por exemplo, condição especial para novos clientes) antes de publicar e informe o prazo.\nFechamento: ${cta}\n${tags}`;
    case 'DEPOIMENTO': return `Peça a um cliente real autorização para compartilhar o feedback dele (ou um print da conversa, sem dados pessoais). Não publique depoimentos sem permissão.\nLegenda: "Obrigado pela confiança!" + ${cta}\n${tags}`;
    case 'ENQUETE': return generateTexts('ENQUETE', b, seed)[0].text;
    case 'ANTES_DEPOIS': return `Mostre o antes e o depois de um trabalho seu de ${b.service}, com autorização do cliente e sem expor dados pessoais.\nLegenda: conte o que foi feito. ${cta}\n${tags}`;
    default: return '';
  }
}

export function buildCalendar(brief, { weeks, postsPerWeek, startDate }, seed) {
  const rng = createRng(seed >>> 0);
  const days = DAYS[postsPerWeek];
  const start = new Date(`${startDate}T12:00:00Z`);
  // Ciclo de tipos: começa pela apresentação; a promoção só entra com oferta informada; depois alterna.
  const pool = ['DICA', 'BASTIDORES', 'ENQUETE', 'ANTES_DEPOIS', 'DEPOIMENTO', ...(brief.offer ? ['PROMOCAO'] : [])];
  let order = ['APRESENTACAO'];
  const items = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(start.getTime() + w * 7 * 86400_000);
    const startDow = weekStart.getUTCDay();
    const dates = days.map((d) => new Date(weekStart.getTime() + ((d - startDow + 7) % 7) * 86400_000)).sort((a, b) => a - b);
    for (const date of dates) {
      if (!order.length) order = shuffle(rng, pool);
      const type = order.shift();
      items.push({
        date: date.toISOString().slice(0, 10), weekday: WEEKDAY[date.getUTCDay()], week: w + 1, type, typeLabel: POST_TYPES[type],
        draft: draft(type, brief, rng, (seed + items.length * 7919) >>> 0), done: false,
      });
    }
  }
  return items;
}
