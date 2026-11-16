// Seleção do gateway de pagamento. Por padrão a cobrança fica DESLIGADA (BILLING_ENABLED=false).
// Só opera quando BILLING_ENABLED=true e as credenciais do Asaas estão configuradas — após aprovação comercial expressa.
import { env } from '../../config/env.js';
import { recordEvent } from '../../modules/reports/events.js';
import { AppError } from '../../utils/errors.js';
import { createAsaasGateway } from './asaas.js';

const disabled = (msg = 'A cobrança ainda não foi ativada. Nenhum pagamento é realizado neste momento.') => new AppError(409, msg, 'BILLING_DISABLED');

export const nullGateway = {
  name: 'none',
  async ping() { throw disabled('Gateway não configurado.'); },
  async ensureCustomer() { throw disabled(); },
  async createSubscription() { throw disabled(); },
  async firstPaymentUrl() { throw disabled(); },
  async cancelSubscription() { throw disabled(); },
  async updateSubscriptionValue() { throw disabled(); },
  verifyWebhook() { return false; },
};

let override = null; // injeção para testes
export const setGatewayForTests = (gw) => { override = gw; };

let cached = null;
export function getGateway() {
  if (override) return override;
  if (!env.BILLING_ENABLED) return nullGateway;
  cached ??= createAsaasGateway({
    apiKey: env.ASAAS_API_KEY, environment: env.ASAAS_ENV, baseUrl: env.ASAAS_BASE_URL, webhookToken: env.ASAAS_WEBHOOK_TOKEN,
    onError: (e) => recordEvent({ level: 'error', source: 'asaas', message: `${e.path} ${e.status ?? ''} ${e.message}`.trim() }),
  });
  return cached;
}

export const billingEnabled = () => getGateway() !== nullGateway;

// Estado de prontidão (administração): o que falta para começar a operar.
export function readiness() {
  const checks = [
    { id: 'apiKey', label: 'Chave de API do Asaas (ASAAS_API_KEY)', ok: Boolean(env.ASAAS_API_KEY) },
    { id: 'webhookToken', label: 'Token do webhook (ASAAS_WEBHOOK_TOKEN, mínimo 32 caracteres)', ok: Boolean(env.ASAAS_WEBHOOK_TOKEN) },
    { id: 'environment', label: `Ambiente: ${env.ASAAS_ENV}${env.ASAAS_ENV === 'production' ? '' : ' (sandbox — sem cobrança real)'}`, ok: true },
    { id: 'enabled', label: 'Cobrança habilitada (BILLING_ENABLED=true)', ok: env.BILLING_ENABLED },
  ];
  return { gateway: 'asaas', environment: env.ASAAS_ENV, enabled: billingEnabled(), ready: checks.every((c) => c.ok), checks, webhookPath: '/api/billing/webhook/asaas' };
}
