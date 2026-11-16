// Adaptador do Asaas (https://docs.asaas.com). Cartão, PIX e boleto são pagos na página hospedada do Asaas (invoiceUrl):
// nenhum dado de cartão passa pelo nosso servidor. Não guardamos CPF/CNPJ do pagador (só repassamos ao Asaas).
import crypto from 'node:crypto';
import { AppError } from '../../utils/errors.js';

export const ASAAS_URLS = { production: 'https://api.asaas.com/v3', sandbox: 'https://api-sandbox.asaas.com/v3' };
export const BILLING_TYPES = ['UNDEFINED', 'PIX', 'BOLETO', 'CREDIT_CARD'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);

export function createAsaasGateway({ apiKey, environment = 'sandbox', baseUrl, webhookToken, fetchImpl = fetch, onError = () => {}, retryDelayMs = 700 }) {
  const root = (baseUrl ?? ASAAS_URLS[environment]).replace(/\/+$/, '');

  async function request(method, path, body) {
    let res;
    try {
      res = await fetchImpl(`${root}${path}`, {
        method, signal: AbortSignal.timeout(20_000),
        headers: { access_token: apiKey, 'Content-Type': 'application/json', 'User-Agent': 'CHAMALAFREE/1.0', accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      onError({ path, message: e.message });
      throw new AppError(502, 'Não foi possível falar com o gateway de pagamento. Tente novamente em instantes.', 'GATEWAY_UNAVAILABLE');
    }
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json;
    const descriptions = (json.errors ?? []).map((e) => e.description).filter(Boolean);
    if (res.status === 400 && descriptions.length) throw new AppError(400, descriptions.join(' '), 'GATEWAY_REJECTED'); // ex.: CPF/CNPJ inválido
    onError({ path, status: res.status, message: descriptions.join(' ') || `HTTP ${res.status}` });
    throw new AppError(502, 'O gateway de pagamento recusou a operação. A equipe foi avisada.', 'GATEWAY_ERROR', { status: res.status });
  }

  return {
    name: 'asaas', environment,

    // Teste de conectividade/credencial (somente leitura).
    async ping() { await request('GET', '/finance/balance'); return true; },

    async ensureCustomer({ user, cpfCnpj, gatewayCustomerId }) {
      const digits = String(cpfCnpj).replace(/\D/g, '');
      if (gatewayCustomerId) {
        await request('PUT', `/customers/${gatewayCustomerId}`, { name: user.name, email: user.email, cpfCnpj: digits });
        return gatewayCustomerId;
      }
      const c = await request('POST', '/customers', { name: user.name, email: user.email, cpfCnpj: digits, externalReference: user.id });
      return c.id;
    },

    // Assinatura mensal; a primeira cobrança vence hoje. `value` em centavos.
    async createSubscription({ customerId, plan, valueCents, billingType = 'UNDEFINED', reference }) {
      if (!BILLING_TYPES.includes(billingType)) throw new AppError(400, 'Forma de pagamento inválida');
      const s = await request('POST', '/subscriptions', {
        customer: customerId, billingType, value: valueCents / 100, nextDueDate: today(), cycle: 'MONTHLY',
        description: `Plano ${plan.name} — CHAMALÁFREE`, externalReference: reference,
      });
      return s.id;
    },

    // Link da página de pagamento da primeira cobrança (o Asaas gera a cobrança logo após criar a assinatura).
    async firstPaymentUrl(subscriptionId) {
      for (let i = 0; i < 4; i++) {
        const r = await request('GET', `/subscriptions/${subscriptionId}/payments?limit=1`);
        const url = r.data?.[0]?.invoiceUrl;
        if (url) return url;
        await sleep(retryDelayMs);
      }
      return null;
    },

    async cancelSubscription(subscriptionId) { await request('DELETE', `/subscriptions/${subscriptionId}`); },

    async updateSubscriptionValue(subscriptionId, valueCents) {
      await request('PUT', `/subscriptions/${subscriptionId}`, { value: valueCents / 100, updatePendingPayments: true });
    },

    // O Asaas envia o token configurado no webhook no cabeçalho `asaas-access-token`.
    verifyWebhook(headers) {
      const got = Buffer.from(String(headers['asaas-access-token'] ?? ''));
      const want = Buffer.from(String(webhookToken ?? ''));
      return want.length >= 32 && got.length === want.length && crypto.timingSafeEqual(got, want);
    },
  };
}
