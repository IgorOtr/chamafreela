import { z } from 'zod';
import { capacityOf } from './engine.js';

const money = (max = 10_000_000) => z.number().min(0).max(max);

export const inputsSchema = z.object({
  ticket: z.number().gt(0, 'O ticket médio deve ser maior que zero').max(1_000_000),
  expectedClients: z.number().min(0).max(100_000),
  servicesPerClient: z.number().min(0.1).max(100).default(1),
  workDaysPerMonth: z.number().min(1).max(31),
  servicesPerDay: z.number().min(0.1).max(500),
  fixedCostsMonthly: money().default(0),
  variableCostPerService: money(1_000_000).default(0),
  travelCostPerService: money(1_000_000).default(0),
  taxRatePercent: z.number().min(0).max(100).default(0),
  fixedTaxMonthly: money().default(0),
  equipmentInvestment: money().default(0),
  initialCapital: money().default(0),
}).refine((i) => capacityOf(i) >= 1, { message: 'A capacidade (dias × serviços por dia) deve ser de pelo menos 1 serviço/mês', path: ['servicesPerDay'] });

export const assumptionsSchema = z.object({
  demandVariationPercent: z.number().min(0).max(200),
  priceVariationPercent: z.number().min(0).max(100),
  costVariationPercent: z.number().min(0).max(100),
  sensitivityPercent: z.number().min(1).max(50),
  horizonMonths: z.number().int().min(1).max(60),
}).partial();

export const createSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome ao cenário').max(80),
  city: z.string().trim().max(80).optional(),
  activity: z.string().trim().max(120).optional(),
  inputs: inputsSchema,
  assumptions: assumptionsSchema.optional(),
  iterations: z.number().int().min(1000).max(50_000).default(10_000),
  seed: z.number().int().min(0).max(2_147_483_647).optional(),
});

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
