import { z } from 'zod';

const text = (max) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const money = z.coerce.number().int().min(0).max(10_000_000).optional();

export const opportunitySchema = z.object({
  title: z.string().trim().min(5, 'Título muito curto').max(120),
  description: z.string().trim().min(20, 'Descreva a demanda (mín. 20 caracteres)').max(3000),
  categoryId: z.string().uuid('Selecione uma categoria'),
  city: z.string().trim().min(2).max(80),
  neighborhood: text(80),
  mode: z.enum(['PRESENCIAL', 'REMOTO', 'HIBRIDO']),
  deadline: z.coerce.date().refine((d) => d.getTime() > Date.now(), 'O prazo deve ser uma data futura')
    .refine((d) => d.getTime() < Date.now() + 366 * 86400_000, 'O prazo máximo é de 1 ano'),
  contractType: z.enum(['PONTUAL', 'RECORRENTE', 'TEMPORARIO', 'VAGA_FIXA']),
  requirements: text(2000),
  payMin: money,
  payMax: money,
  contactChannel: z.string().trim().min(3, 'Informe um canal de contato').max(200),
}).refine((v) => v.payMin == null || v.payMax == null || v.payMax >= v.payMin, { message: 'A faixa máxima deve ser maior que a mínima', path: ['payMax'] });

export const catalogQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  contractType: z.enum(['PONTUAL', 'RECORRENTE', 'TEMPORARIO', 'VAGA_FIXA']).optional(),
});

export const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDENTE', 'PUBLICADA', 'REJEITADA', 'ENCERRADA']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const reviewSchema = z.object({
  action: z.enum(['APROVAR', 'REJEITAR', 'ENCERRAR']),
  reason: z.string().trim().max(500).optional(),
}).refine((v) => v.action !== 'REJEITAR' || !!v.reason, { message: 'Informe o motivo da rejeição', path: ['reason'] });

export const interestSchema = z.object({ message: z.string().trim().max(500).optional().transform((v) => v || undefined) });
