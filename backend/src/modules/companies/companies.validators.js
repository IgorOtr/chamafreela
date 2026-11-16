import { z } from 'zod';
import { isValidCnpj } from '../../utils/cnpj.js';

const text = (max) => z.string().trim().max(max).optional().transform((v) => v || undefined);

export const companySchema = z.object({
  tradeName: z.string().trim().min(2, 'Informe o nome da empresa').max(120),
  legalName: text(160),
  cnpj: z.string().optional().transform((v) => (v ? v.replace(/\D/g, '') : undefined))
    .refine((v) => !v || isValidCnpj(v), 'CNPJ inválido'),
  description: text(1000),
  city: z.string().trim().min(2).max(80),
  phone: z.string().transform((v) => v.replace(/\D/g, '')).refine((v) => /^\d{10,13}$/.test(v), 'Telefone inválido (use DDD + número)'),
  website: z.string().trim().url('Site inválido').refine((u) => /^https?:\/\//i.test(u), 'Use http(s)').optional().or(z.literal('').transform(() => undefined)),
  responsibleName: z.string().trim().min(2, 'Informe o responsável').max(120),
  responsibleRole: text(80),
});

export const companyAdminQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
});
export const companyStatusSchema = z.object({ status: z.enum(['ATIVA', 'SUSPENSA']) });
