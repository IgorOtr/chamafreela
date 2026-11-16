import crypto from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { assertAssetCapacity, consume } from '../billing/entitlements.js';
import { buildCalendar, POST_TYPES } from './calendar.js';
import { checkContrast, FONTS, PALETTES } from './colors.js';
import { buildLogoSvg, SHAPES } from './logo.js';
import { generateTexts, TONES, TYPES } from './texts.js';

const MAX_ASSETS = 200;
const newSeed = () => crypto.randomInt(0, 2_147_483_647);

export const options = () => ({
  types: TYPES, tones: TONES, palettes: PALETTES, fonts: Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, { label: v.label, stack: v.stack, weight: v.weight }])),
  shapes: SHAPES, postTypes: POST_TYPES,
  notice: 'Os textos são montados a partir de modelos e usam somente as informações que você fornecer. Revise antes de publicar: nada é publicado automaticamente.',
});

export async function generate(user, { type, brief, seed }) {
  await consume(user, 'studioGenerationsPerMonth');
  const usedSeed = seed ?? newSeed();
  return { seed: usedSeed, type, variants: generateTexts(type, brief, usedSeed) };
}

export function logoPreview({ businessName, colors, fontKey, logo }) {
  return { svg: buildLogoSvg({ businessName, initials: logo.initials, shape: logo.shape, wordmark: logo.wordmark, fontKey, colors }), contrast: checkContrast(colors) };
}

export const getBrand = (userId) => prisma.brandKit.findUnique({ where: { userId } });

export async function saveBrand(user, b) {
  const svg = buildLogoSvg({ businessName: b.businessName, initials: b.logo.initials, shape: b.logo.shape, wordmark: b.logo.wordmark, fontKey: b.fontKey, colors: b.colors });
  const data = {
    businessName: b.businessName, tagline: b.tagline ?? null, segment: b.segment, city: b.city ?? null, mainService: b.mainService ?? null,
    differentiator: b.differentiator ?? null, contactLine: b.contactLine ?? null, colors: b.colors, fontKey: b.fontKey, logoConfig: b.logo, logoSvg: svg,
  };
  const saved = await prisma.brandKit.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } });
  return { ...saved, contrast: checkContrast(b.colors) };
}

export async function calendar(user, { brief, weeks, postsPerWeek, startDate, seed }) {
  await consume(user, 'studioGenerationsPerMonth');
  const usedSeed = seed ?? newSeed();
  return { seed: usedSeed, items: buildCalendar(brief, { weeks, postsPerWeek, startDate }, usedSeed) };
}

// ---- Materiais salvos (somente do titular)
export const listAssets = (userId, type) => prisma.marketingAsset.findMany({ where: { userId, ...(type && { type }) }, orderBy: { updatedAt: 'desc' }, take: MAX_ASSETS });

export async function createAsset(user, body) {
  await assertAssetCapacity(user);
  if ((await prisma.marketingAsset.count({ where: { userId: user.id } })) >= MAX_ASSETS) throw badRequest(`Limite de ${MAX_ASSETS} materiais salvos atingido. Exclua algum para continuar.`);
  return prisma.marketingAsset.create({ data: { userId: user.id, type: body.type, title: body.title, content: body.content, data: body.data ?? undefined } });
}

async function owned(user, id) {
  const a = await prisma.marketingAsset.findFirst({ where: { id, userId: user.id } });
  if (!a) throw notFound('Material não encontrado');
  return a;
}
export async function updateAsset(user, id, patch) { await owned(user, id); return prisma.marketingAsset.update({ where: { id }, data: patch }); }
export async function deleteAsset(user, id) { await owned(user, id); await prisma.marketingAsset.delete({ where: { id } }); }
