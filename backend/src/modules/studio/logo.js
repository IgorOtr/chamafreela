// Gera o logotipo em SVG no SERVIDOR a partir de uma configuração validada.
// Todo texto é escapado e só são usadas formas/atributos fixos: nunca se armazena SVG enviado pelo cliente.
import { FONTS } from './colors.js';

const CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']);
export const SHAPES = ['circulo', 'quadrado', 'escudo', 'hexagono'];

const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function deriveInitials(name) {
  const clean = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const words = clean.split(/[^A-Za-z0-9]+/).filter((w) => w && !CONNECTORS.has(w.toLowerCase()));
  const letters = (words.length ? words : clean.split(/\s+/)).slice(0, 2).map((w) => w[0]).join('');
  return letters.toUpperCase().slice(0, 2) || 'CF';
}

function mark(shape, fill) {
  switch (shape) {
    case 'circulo': return `<circle cx="60" cy="60" r="56" fill="${fill}"/>`;
    case 'quadrado': return `<rect x="4" y="4" width="112" height="112" rx="26" fill="${fill}"/>`;
    case 'escudo': return `<path d="M60 4 L112 22 V62 C112 90 88 110 60 118 C32 110 8 90 8 62 V22 Z" fill="${fill}"/>`;
    case 'hexagono': return `<path d="M60 4 L112 32 V88 L60 116 L8 88 V32 Z" fill="${fill}"/>`;
    default: throw new Error('forma inválida');
  }
}

export function buildLogoSvg({ businessName, initials, shape, wordmark, fontKey, colors }) {
  const font = FONTS[fontKey] ?? FONTS.moderna;
  const text = initials || deriveInitials(businessName);
  const name = businessName.length > 26 ? `${businessName.slice(0, 25)}…` : businessName;
  const markSize = text.length > 1 ? 44 : 56;
  const width = wordmark ? 120 + 20 + Math.min(360, Math.max(140, name.length * 17)) : 120;
  const nameSize = name.length > 16 ? 26 : 32;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 120" width="${width}" height="120" role="img" aria-label="${escapeXml(businessName)}">`,
    mark(shape, colors.primary),
    `<text x="60" y="${60 + markSize * 0.35}" text-anchor="middle" font-family='${font.stack}' font-weight="${font.weight}" font-size="${markSize}" fill="#ffffff">${escapeXml(text)}</text>`,
    wordmark ? `<text x="140" y="72" font-family='${font.stack}' font-weight="${font.weight}" font-size="${nameSize}" fill="${colors.text}">${escapeXml(name)}</text><rect x="140" y="84" width="48" height="6" rx="3" fill="${colors.accent}"/>` : '',
    '</svg>',
  ].join('');
}
