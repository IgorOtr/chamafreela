import { z } from 'zod';

const text = (max) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const httpUrl = z.string().trim().url('URL inválida').refine((u) => /^https?:\/\//i.test(u), 'Use um link http(s)');

export const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome ou nome comercial').max(120),
  categoryId: z.string().uuid('Selecione uma categoria'),
  headline: text(140),
  description: z.string().trim().min(20, 'Descreva suas atividades (mín. 20 caracteres)').max(2000),
  city: z.string().trim().min(2).max(80),
  neighborhood: text(80),
  mode: z.enum(['PRESENCIAL', 'REMOTO', 'HIBRIDO']),
  radiusKm: z.coerce.number().int().min(0).max(300),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, '')).refine((v) => /^\d{10,13}$/.test(v), 'WhatsApp inválido (use DDD + número)'),
  showContact: z.boolean().default(false),
  otherContacts: text(300),
  experience: text(2000),
  qualifications: text(2000),
  available: z.boolean().default(true),
  preferences: text(500),
  services: z.array(z.object({ name: z.string().trim().min(2).max(100), description: text(500), priceInfo: text(100) })).min(1, 'Informe ao menos um serviço').max(20),
  areas: z.array(z.object({
    city: z.string().trim().min(2).max(80),
    neighborhood: text(80),
    radiusKm: z.coerce.number().int().min(0).max(300).default(10),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })).max(20).default([]),
  portfolio: z.array(z.object({ type: z.enum(['IMAGEM', 'VIDEO']), url: httpUrl, caption: text(200) })).max(12).default([]),
});

export const catalogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  neighborhood: z.string().trim().max(80).optional(),
});

export const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDENTE', 'APROVADO', 'REJEITADO', 'OCULTO']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const reviewSchema = z.object({
  action: z.enum(['APROVAR', 'REJEITAR', 'OCULTAR', 'REEXIBIR']),
  reason: z.string().trim().max(500).optional(),
}).refine((v) => v.action !== 'REJEITAR' || !!v.reason, { message: 'Informe o motivo da rejeição', path: ['reason'] });

export const adminEditSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  headline: z.string().trim().max(140).optional(),
  description: z.string().trim().min(20).max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  featured: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nada para atualizar');
