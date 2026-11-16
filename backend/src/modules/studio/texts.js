// Geradores de texto por MODELOS (sem IA externa e sem envio de dados). Determinísticos por semente.
// Regra de ouro: só usam fatos informados pelo usuário. Os modelos não inventam números, prazos, preços,
// anos de experiência, certificações, garantias nem depoimentos.
import { createRng } from '../simulations/engine.js';

export const TYPES = {
  LEGENDA: 'Legenda para redes sociais',
  PROMOCAO: 'Texto promocional',
  ROTEIRO_VIDEO: 'Roteiro de vídeo (Reels/TikTok)',
  ENQUETE: 'Ideia de enquete',
  DESCRICAO_SERVICO: 'Descrição comercial de serviço',
  APRESENTACAO: 'Apresentação do negócio',
};
export const TONES = { PROFISSIONAL: 'Profissional', DESCONTRAIDO: 'Descontraído', INSPIRADOR: 'Inspirador' };

const DEFAULT_CTA = { PROFISSIONAL: 'Entre em contato e solicite seu orçamento.', DESCONTRAIDO: 'Chama a gente e vamos conversar!', INSPIRADOR: 'Dê o próximo passo: fale com a gente hoje.' };

function shuffle(rng, arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function hashtags(b) {
  const tags = [slug(b.service), b.city && slug(b.city), slug(b.businessName), 'negociolocal'].filter((t) => t && t.length > 2);
  return [...new Set(tags)].slice(0, 4).map((t) => `#${t}`).join(' ');
}

const where = (b) => (b.city ? ` em ${b.city}` : '');
const diff = (b) => (b.differentiator ? ` Nosso diferencial: ${b.differentiator.replace(/[.!]+$/, '')}.` : '');
const ctaOf = (b) => (b.cta?.trim() || DEFAULT_CTA[b.tone]);

const LEGENDA = {
  PROFISSIONAL: {
    open: (b) => [`${b.service}${where(b)} com atendimento sério e organizado.`, `Precisa de ${b.service}${where(b)}? ${b.businessName} cuida disso para você.`, `${b.businessName}: ${b.service}${where(b)}, com atenção a cada detalhe.`],
    mid: (b) => [`Trabalhamos para que você tenha um serviço bem feito e um atendimento claro do início ao fim.`, `Cada atendimento é planejado para atender o que você realmente precisa.`, `Do primeiro contato à entrega, o foco é o seu resultado.`],
  },
  DESCONTRAIDO: {
    open: (b) => [`Bora cuidar de ${b.service}${where(b)}? 😄`, `Tá precisando de ${b.service}${where(b)}? Pode contar com ${b.businessName}!`, `${b.service}${where(b)} sem dor de cabeça? Chega mais! ✨`],
    mid: (b) => [`A gente cuida de tudo com capricho e conversa clara, sem complicação.`, `Aqui o atendimento é próximo e o serviço é feito com carinho.`, `Menos preocupação pra você, mais tempo livre pro que importa.`],
  },
  INSPIRADOR: {
    open: (b) => [`Todo grande resultado começa com um bom primeiro passo. ${b.service}${where(b)} com ${b.businessName}.`, `Transformar o seu dia a dia é possível. ${b.service}${where(b)} é com a gente.`, `Talento em ação: ${b.businessName}, ${b.service}${where(b)}.`],
    mid: (b) => [`Acreditamos em trabalho bem feito e em gente atendida com respeito.`, `Cada serviço é uma oportunidade de entregar algo de que você vai se orgulhar.`, `Trabalhar com dedicação é o nosso jeito de fazer a diferença.`],
  },
};

function legenda(b, rng) {
  const t = LEGENDA[b.tone];
  const o = shuffle(rng, t.open(b)), m = shuffle(rng, t.mid(b));
  return [0, 1, 2].map((i) => ({ title: `Legenda ${i + 1}`, text: `${o[i]}\n\n${m[i]}${diff(b)}\n\n${ctaOf(b)}\n\n${hashtags(b)}` }));
}

const PROMO = {
  PROFISSIONAL: (b) => [`Oferta ${b.businessName}: ${b.offer}${b.deadline ? ` — ${b.deadline}` : ''}. ${b.service}${where(b)}.`, `Condição especial em ${b.service}${where(b)}: ${b.offer}${b.deadline ? ` (${b.deadline})` : ''}.`, `${b.businessName} informa: ${b.offer}${b.deadline ? `, ${b.deadline}` : ''}. Aproveite.`],
  DESCONTRAIDO: (b) => [`Olha que legal! ${b.offer}${b.deadline ? ` — ${b.deadline}` : ''} 🎉 ${b.service}${where(b)} com ${b.businessName}.`, `Promoção no ar em ${b.businessName}! ${b.offer}${b.deadline ? ` (${b.deadline})` : ''}. Chega mais! ✨`, `Presente pra você: ${b.offer}${b.deadline ? `, ${b.deadline}` : ''}. ${b.service}${where(b)} é com a gente!`],
  INSPIRADOR: (b) => [`É a hora de agir: ${b.offer}${b.deadline ? ` — ${b.deadline}` : ''}. ${b.service}${where(b)} com ${b.businessName}.`, `Uma boa oportunidade merece ser aproveitada: ${b.offer}${b.deadline ? ` (${b.deadline})` : ''}. ${b.businessName}, ${b.service}${where(b)}.`, `Dê esse passo agora: ${b.offer}${b.deadline ? `, ${b.deadline}` : ''}. ${b.service}${where(b)}.`],
};
const promocao = (b, rng) => shuffle(rng, PROMO[b.tone](b)).map((o, i) => ({ title: `Promoção ${i + 1}`, text: `${o}\n\n${ctaOf(b)}\n\n${hashtags(b)}` }));

const HOOKS = {
  PROFISSIONAL: (b) => [`Você sabe o que avaliar ao contratar ${b.service}${where(b)}?`, `Três perguntas antes de contratar ${b.service}.`, `O que muita gente esquece ao contratar ${b.service}?`],
  DESCONTRAIDO: (b) => [`Pare de rolar! Se você precisa de ${b.service}, esse vídeo é pra você 👀`, `Dá uma olhada nisso antes de contratar ${b.service}!`, `Bastidores de ${b.service}${where(b)}: vem ver!`],
  INSPIRADOR: (b) => [`Todo mundo começa em algum lugar: assim eu cuido de ${b.service}${where(b)}.`, `Por que eu faço ${b.service}? Deixa eu te contar.`, `O que move o nosso trabalho com ${b.service}.`],
};
function roteiro(b, rng) {
  const hooks = shuffle(rng, HOOKS[b.tone](b));
  const dev = [
    'Mostre o trabalho em andamento (antes, durante ou resultado) e explique em uma frase o que está sendo feito.',
    'Responda a uma dúvida real que seus clientes costumam ter e mostre a solução na prática.',
    'Mostre o seu ambiente de trabalho e as ferramentas, apresentando-se pelo nome.',
  ];
  const d = shuffle(rng, dev);
  return [0, 1, 2].map((i) => ({
    title: `Roteiro ${i + 1}`,
    text: [`GANCHO (0–3 s): ${hooks[i]}`, `DESENVOLVIMENTO (4–20 s): ${d[i]}${b.differentiator ? ` Cite o seu diferencial: ${b.differentiator.replace(/[.!]+$/, '')}.` : ''}`, `FECHAMENTO (últimos segundos): ${ctaOf(b)}`, `TEXTO NA TELA: ${b.businessName} · ${b.service}${where(b)}`, `LEGENDA: ${hashtags(b)}`, 'DICA: use a luz natural, grave na vertical e mantenha o vídeo curto.'].join('\n'),
  }));
}

function enquete(b, rng) {
  const ideas = [
    { q: `Qual serviço de ${b.service} você mais procura?`, o: ['Manutenção', 'Instalação', 'Orçamento / dúvida'] },
    { q: `Qual horário é melhor para ser atendido${where(b)}?`, o: ['Manhã', 'Tarde', 'Noite'] },
    { q: `Você já contratou ${b.service} antes?`, o: ['Sim, e foi ótimo', 'Sim, mas tive problemas', 'Ainda não'] },
    { q: `O que mais importa na hora de escolher ${b.service}?`, o: ['Preço', 'Qualidade', 'Rapidez'] },
    { q: `Quer ver mais conteúdo sobre ${b.service}?`, o: ['Quero dicas', 'Quero bastidores', 'Quero ofertas'] },
  ];
  return shuffle(rng, ideas).slice(0, 3).map((x, i) => ({ title: `Enquete ${i + 1}`, text: `${x.q}\n${x.o.map((o, k) => `${k + 1}) ${o}`).join('\n')}\n\nUse no recurso de enquete do Stories. Depois, responda quem votou e convide: ${ctaOf(b)}` }));
}

function descricao(b, rng) {
  const detail = b.serviceDetail ? ` ${b.serviceDetail.replace(/[.!]+$/, '')}.` : '';
  const opts = {
    PROFISSIONAL: [`${b.service}${where(b)} realizado por ${b.businessName}.${detail}${diff(b)} ${ctaOf(b)}`, `Conheça o serviço de ${b.service} de ${b.businessName}.${detail}${diff(b)} ${ctaOf(b)}`, `${b.businessName} oferece ${b.service}${where(b)}.${detail}${diff(b)} ${ctaOf(b)}`],
    DESCONTRAIDO: [`${b.service}${where(b)} com ${b.businessName}, do jeitinho que você precisa!${detail}${diff(b)} ${ctaOf(b)}`, `Quer ${b.service} sem complicação? A gente faz!${detail}${diff(b)} ${ctaOf(b)}`, `Aqui você encontra ${b.service}${where(b)} com atendimento próximo.${detail}${diff(b)} ${ctaOf(b)}`],
    INSPIRADOR: [`${b.service}${where(b)}: trabalho feito com dedicação por ${b.businessName}.${detail}${diff(b)} ${ctaOf(b)}`, `Cada ${b.service} é uma chance de entregar um bom resultado.${detail}${diff(b)} ${ctaOf(b)}`, `${b.businessName} transforma ${b.service} em tranquilidade para você.${detail}${diff(b)} ${ctaOf(b)}`],
  };
  return shuffle(rng, opts[b.tone]).map((t, i) => ({ title: `Descrição ${i + 1}`, text: t.replace(/\s+/g, ' ').trim() }));
}

function apresentacao(b, rng) {
  const opts = {
    PROFISSIONAL: [`Somos ${b.businessName}, com foco em ${b.service}${where(b)}.${diff(b)} Atendemos com organização e respeito ao seu tempo. ${ctaOf(b)}`, `${b.businessName} — ${b.service}${where(b)}.${diff(b)} ${ctaOf(b)}`, `Bem-vindo a ${b.businessName}. Trabalhamos com ${b.service}${where(b)}.${diff(b)} ${ctaOf(b)}`],
    DESCONTRAIDO: [`Oi! Aqui é ${b.businessName} 👋 A gente trabalha com ${b.service}${where(b)}.${diff(b)} ${ctaOf(b)}`, `Prazer, ${b.businessName}! ${b.service}${where(b)} com papo reto e serviço caprichado.${diff(b)} ${ctaOf(b)}`, `${b.businessName} por aqui: ${b.service}${where(b)}.${diff(b)} ${ctaOf(b)}`],
    INSPIRADOR: [`${b.businessName} nasceu do desejo de fazer ${b.service} com dedicação${where(b)}.${diff(b)} ${ctaOf(b)}`, `Fazemos ${b.service}${where(b)} acreditando que trabalho bem feito muda o dia de quem contrata.${diff(b)} ${ctaOf(b)}`, `${b.businessName}: talento transformado em serviço${where(b)}.${diff(b)} ${ctaOf(b)}`],
  };
  return shuffle(rng, opts[b.tone]).map((t, i) => ({ title: `Apresentação ${i + 1}`, text: t.replace(/\s+/g, ' ').trim() }));
}

const GENERATORS = { LEGENDA: legenda, PROMOCAO: promocao, ROTEIRO_VIDEO: roteiro, ENQUETE: enquete, DESCRICAO_SERVICO: descricao, APRESENTACAO: apresentacao };

export function generateTexts(type, brief, seed) {
  const gen = GENERATORS[type];
  if (!gen) throw new Error('tipo inválido');
  return gen(brief, createRng(seed >>> 0));
}
export { pick, shuffle, ctaOf, hashtags as makeHashtags };
