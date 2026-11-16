// Heurísticas simples de prevenção a anúncios fraudulentos. Não bloqueiam: sinalizam para o moderador.
const RULES = [
  { flag: 'PAGAMENTO_ANTECIPADO', re: /(pagamento|taxa|dep[óo]sito|pix)\s+(antecipad|adiantad|antes|inicial)|pague\s+antes|kit\s+inicial|investimento\s+inicial/i },
  { flag: 'LINK_ENCURTADO', re: /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly)\//i },
  { flag: 'PROMESSA_DE_GANHO_FACIL', re: /ganhos?\s+(garantid|f[áa]ce)|renda\s+extra\s+garantid|sem\s+(sair\s+de\s+casa|experi[êe]ncia).{0,40}ganh/i },
  { flag: 'CONTATO_EXTERNO_SUSPEITO', re: /telegram|t\.me\/|chame\s+no\s+privado/i },
];

export function detectFlags(...fields) {
  const text = fields.filter(Boolean).join('\n');
  return RULES.filter((r) => r.re.test(text)).map((r) => r.flag);
}
