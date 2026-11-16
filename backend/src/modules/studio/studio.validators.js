import { z } from 'zod';
import { FONTS, HEX, PALETTES } from './colors.js';
import { SHAPES } from './logo.js';
import { POST_TYPES } from './calendar.js';
import { TONES, TYPES } from './texts.js';

const text = (max) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const color = z.string().regex(HEX, 'Cor inválida (use #RRGGBB)');

export const briefSchema = z.object({
  businessName: z.string().trim().min(2, 'Informe o nome do negócio').max(60),
  service: z.string().trim().min(2, 'Informe o serviço principal').max(80),
  city: text(60),
  differentiator: text(160),
  tone: z.enum(Object.keys(TONES)).default('PROFISSIONAL'),
  cta: text(120),
  offer: text(120),
  deadline: text(60),
  serviceDetail: text(200),
});

export const generateSchema = z.object({
  type: z.enum(Object.keys(TYPES)),
  brief: briefSchema,
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
}).refine((v) => v.type !== 'PROMOCAO' || !!v.brief.offer, { message: 'Informe a oferta para gerar o texto promocional', path: ['brief', 'offer'] });

export const logoConfigSchema = z.object({
  shape: z.enum(SHAPES).default('circulo'),
  initials: z.string().trim().max(2).regex(/^[A-Za-z0-9]*$/, 'Use apenas letras e números').optional().transform((v) => (v ? v.toUpperCase() : undefined)),
  wordmark: z.boolean().default(true),
});

export const colorsSchema = z.object({ primary: color, secondary: color, accent: color, text: color, background: color });

export const brandSchema = z.object({
  businessName: z.string().trim().min(2).max(60),
  tagline: text(100),
  segment: z.enum(PALETTES.map((p) => p.id)).default('geral'),
  city: text(60),
  mainService: text(80),
  differentiator: text(160),
  contactLine: text(120),
  colors: colorsSchema,
  fontKey: z.enum(Object.keys(FONTS)).default('moderna'),
  logo: logoConfigSchema.default({ shape: 'circulo', wordmark: true }),
});

export const logoPreviewSchema = z.object({ businessName: z.string().trim().min(2).max(60), colors: colorsSchema, fontKey: z.enum(Object.keys(FONTS)).default('moderna'), logo: logoConfigSchema.default({ shape: 'circulo', wordmark: true }) });

export const calendarSchema = z.object({
  brief: briefSchema,
  weeks: z.number().int().min(1).max(8),
  postsPerWeek: z.number().int().min(1).max(7),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'Data inválida'),
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
});

export const ASSET_TYPES = [...Object.keys(TYPES), 'CARTAO', 'POST', 'STORY', 'CALENDARIO'];
export const assetSchema = z.object({
  type: z.enum(ASSET_TYPES),
  title: z.string().trim().min(1).max(100),
  content: z.string().max(20_000).default(''),
  data: z.any().optional().refine((d) => d === undefined || JSON.stringify(d).length <= 60_000, 'Dados grandes demais'),
});
export const assetPatchSchema = z.object({ title: z.string().trim().min(1).max(100).optional(), content: z.string().max(20_000).optional(), data: assetSchema.shape.data })
  .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar');
export const assetListQuery = z.object({ type: z.enum(ASSET_TYPES).optional() });
export { POST_TYPES };
