import { z } from 'zod';

const base = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter ao menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(7),
  SITE_URL: z.string().url().default('http://localhost:5173'),
  BILLING_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  ENABLE_DOCS: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  ASAAS_API_KEY: z.string().trim().min(10).optional(),
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_WEBHOOK_TOKEN: z.string().trim().min(32, 'ASAAS_WEBHOOK_TOKEN deve ter ao menos 32 caracteres').optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

// Falha rápida: não é possível ligar a cobrança sem credenciais do gateway.
const schema = base.superRefine((v, ctx) => {
  if (!v.BILLING_ENABLED) return;
  if (!v.ASAAS_API_KEY) ctx.addIssue({ code: 'custom', path: ['ASAAS_API_KEY'], message: 'BILLING_ENABLED=true exige ASAAS_API_KEY' });
  if (!v.ASAAS_WEBHOOK_TOKEN) ctx.addIssue({ code: 'custom', path: ['ASAAS_WEBHOOK_TOKEN'], message: 'BILLING_ENABLED=true exige ASAAS_WEBHOOK_TOKEN' });
});

export const env = schema.parse(process.env);
