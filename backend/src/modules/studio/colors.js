// Paletas por segmento e utilitários de contraste (WCAG 2.1).
export const HEX = /^#[0-9a-f]{6}$/i;

export const PALETTES = [
  { id: 'geral', name: 'Geral', colors: { primary: '#0f5c4d', secondary: '#e6f4ef', accent: '#f59e0b', text: '#14211e', background: '#ffffff' } },
  { id: 'construcao', name: 'Construção e reformas', colors: { primary: '#1f3a5f', secondary: '#e8eef6', accent: '#f2a900', text: '#16202e', background: '#ffffff' } },
  { id: 'beleza', name: 'Beleza e estética', colors: { primary: '#8e2a5a', secondary: '#fbeaf2', accent: '#e8a0bf', text: '#2a1420', background: '#ffffff' } },
  { id: 'alimentacao', name: 'Alimentação', colors: { primary: '#b3261e', secondary: '#fff1e0', accent: '#f4a300', text: '#2b1a12', background: '#ffffff' } },
  { id: 'tecnologia', name: 'Tecnologia', colors: { primary: '#3a2f8f', secondary: '#ecebfb', accent: '#00b3a4', text: '#14122b', background: '#ffffff' } },
  { id: 'saude', name: 'Saúde e bem-estar', colors: { primary: '#0b6e6e', secondary: '#e3f5f3', accent: '#7bc67b', text: '#102a2a', background: '#ffffff' } },
  { id: 'educacao', name: 'Educação e aulas', colors: { primary: '#1d4ed8', secondary: '#e8effe', accent: '#fbbf24', text: '#101a33', background: '#ffffff' } },
  { id: 'servicos', name: 'Serviços domésticos', colors: { primary: '#2d6a4f', secondary: '#e9f5ee', accent: '#e76f51', text: '#14231b', background: '#ffffff' } },
];

export const FONTS = {
  moderna: { label: 'Moderna', stack: 'Helvetica, Arial, sans-serif', weight: 700 },
  elegante: { label: 'Elegante', stack: 'Georgia, "Times New Roman", serif', weight: 700 },
  amigavel: { label: 'Amigável', stack: '"Trebuchet MS", Verdana, sans-serif', weight: 700 },
  forte: { label: 'Forte', stack: 'Impact, "Arial Black", sans-serif', weight: 400 },
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}

// Pares de cores que a marca usa juntos; avisa quando o texto não atinge 4,5:1 (WCAG AA).
export function checkContrast(colors) {
  const pairs = [
    { id: 'texto_fundo', label: 'Texto sobre o fundo', fg: colors.text, bg: colors.background },
    { id: 'branco_primaria', label: 'Texto branco sobre a cor principal', fg: '#ffffff', bg: colors.primary },
    { id: 'texto_secundaria', label: 'Texto sobre a cor secundária', fg: colors.text, bg: colors.secondary },
    { id: 'texto_destaque', label: 'Texto escuro sobre a cor de destaque', fg: colors.text, bg: colors.accent },
  ];
  return pairs.map((p) => { const ratio = contrastRatio(p.fg, p.bg); return { id: p.id, label: p.label, ratio, ok: ratio >= 4.5 }; });
}
