import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { createAsaasGateway } from '../../integrations/payments/asaas.js';
import { setGatewayForTests } from '../../integrations/payments/gateway.js';
import { isValidCpf, isValidCpfCnpj } from '../../utils/cnpj.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { seedPlans } from '../plans/defaults.js';

const TOKEN = 'token-de-webhook-com-mais-de-32-caracteres-ok';
const CPF = '529.982.247-25'; // CPF válido de teste
const hook = (body, token = TOKEN) => api().post('/api/billing/webhook/asaas').set('asaas-access-token', token).send(body);

// API do Asaas simulada: registra as chamadas e responde como o serviço real.
function fakeAsaas({ failOn } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = url.replace(/^https?:\/\/[^/]+\/v3/, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path, body, headers: init.headers });
    const json = (status, data) => ({ ok: status < 400, status, json: async () => data });
    if (failOn?.test(`${init.method} ${path}`)) return json(400, { errors: [{ code: 'invalid_cpfCnpj', description: 'O CPF/CNPJ informado é inválido.' }] });
    if (init.method === 'POST' && path === '/customers') return json(200, { id: 'cus_001', ...body });
    if (init.method === 'PUT' && path.startsWith('/customers/')) return json(200, { id: path.split('/')[2] });
    if (init.method === 'POST' && path === '/subscriptions') return json(200, { id: `sub_${calls.length}`, ...body });
    if (init.method === 'GET' && /\/subscriptions\/.+\/payments/.test(path)) return json(200, { data: [{ id: 'pay_001', invoiceUrl: 'https://sandbox.asaas.com/i/abc123' }] });
    if (init.method === 'DELETE') return json(200, { deleted: true });
    if (init.method === 'PUT' && path.startsWith('/subscriptions/')) return json(200, { id: path.split('/')[2], ...body });
    if (path === '/finance/balance') return json(200, { balance: 0 });
    return json(404, {});
  };
  return { calls, gateway: createAsaasGateway({ apiKey: 'chave-de-teste-1234567890', environment: 'sandbox', webhookToken: TOKEN, fetchImpl, retryDelayMs: 1 }) };
}

describe('validação de CPF/CNPJ', () => {
  it('aceita documentos válidos e rejeita inválidos', () => {
    assert.equal(isValidCpf(CPF), true);
    assert.equal(isValidCpf('529.982.247-24'), false);
    assert.equal(isValidCpf('111.111.111-11'), false);
    assert.equal(isValidCpfCnpj('11.222.333/0001-81'), true);
    assert.equal(isValidCpfCnpj('123'), false);
  });
});

describe('adaptador do Asaas (sem rede)', () => {
  it('usa a URL do ambiente, os cabeçalhos exigidos e valores em reais', async () => {
    const { calls, gateway } = fakeAsaas();
    const cid = await gateway.ensureCustomer({ user: { id: 'u1', name: 'Maria', email: 'm@x.com' }, cpfCnpj: CPF });
    assert.equal(cid, 'cus_001');
    assert.equal(calls[0].body.cpfCnpj, '52998224725', 'somente dígitos');
    assert.equal(calls[0].body.externalReference, 'u1');
    assert.equal(calls[0].headers.access_token, 'chave-de-teste-1234567890');
    assert.match(calls[0].headers['User-Agent'], /CHAMALAFREE/);
    const sid = await gateway.createSubscription({ customerId: cid, plan: { name: 'PRO' }, valueCents: 999, billingType: 'PIX', reference: 'loc-1' });
    assert.ok(sid.startsWith('sub_'));
    const s = calls.at(-1).body;
    assert.deepEqual([s.value, s.cycle, s.billingType, s.externalReference], [9.99, 'MONTHLY', 'PIX', 'loc-1']);
    assert.match(s.nextDueDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(await gateway.firstPaymentUrl(sid), 'https://sandbox.asaas.com/i/abc123');
    await gateway.updateSubscriptionValue(sid, 1490);
    assert.deepEqual([calls.at(-1).body.value, calls.at(-1).body.updatePendingPayments], [14.9, true]);
    await gateway.cancelSubscription(sid);
    assert.equal(calls.at(-1).method, 'DELETE');
    assert.equal(await gateway.ping(), true);
  });

  it('erro 400 do Asaas vira mensagem ao usuário; demais erros viram 502 genérico e são reportados', async () => {
    const reported = [];
    const bad = createAsaasGateway({ apiKey: 'k'.repeat(12), webhookToken: TOKEN, onError: (e) => reported.push(e), fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ errors: [{ description: 'CPF/CNPJ inválido.' }] }) }) });
    await assert.rejects(bad.ensureCustomer({ user: { id: 'u', name: 'M', email: 'm@x.com' }, cpfCnpj: '1' }), (e) => e.status === 400 && /CPF\/CNPJ inválido/.test(e.message));
    const down = createAsaasGateway({ apiKey: 'k'.repeat(12), webhookToken: TOKEN, onError: (e) => reported.push(e), fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({ errors: [{ description: 'chave inválida' }] }) }) });
    await assert.rejects(down.ping(), (e) => e.status === 502 && !/chave/.test(e.message), 'não vaza detalhes do gateway');
    const net = createAsaasGateway({ apiKey: 'k'.repeat(12), webhookToken: TOKEN, onError: (e) => reported.push(e), fetchImpl: async () => { throw new Error('ECONNRESET'); } });
    await assert.rejects(net.ping(), (e) => e.status === 502 && e.code === 'GATEWAY_UNAVAILABLE');
    assert.equal(reported.length, 2);
  });

  it('verifyWebhook: comparação exata do token em tempo constante', () => {
    const { gateway } = fakeAsaas();
    assert.equal(gateway.verifyWebhook({ 'asaas-access-token': TOKEN }), true);
    assert.equal(gateway.verifyWebhook({ 'asaas-access-token': TOKEN + 'x' }), false);
    assert.equal(gateway.verifyWebhook({ 'asaas-access-token': '' }), false);
    assert.equal(gateway.verifyWebhook({}), false);
    assert.equal(createAsaasGateway({ apiKey: 'k'.repeat(12), webhookToken: 'curto', fetchImpl: async () => {} }).verifyWebhook({ 'asaas-access-token': 'curto' }), false, 'token fraco nunca autentica');
  });
});

describe('checkout, webhook e ciclo da assinatura (Asaas simulado)', () => {
  let fake;
  beforeEach(async () => {
    await resetDb(); await seedPlans(prisma);
    await prisma.plan.update({ where: { code: 'PRO' }, data: { available: true } });
    fake = fakeAsaas(); setGatewayForTests(fake.gateway);
  });
  after(async () => { setGatewayForTests(null); await prisma.$disconnect(); });

  const checkout = (t, extra = {}) => api().post('/api/subscriptions/me/change').set(bearer(t.token)).send({ planCode: 'PRO', cpfCnpj: CPF, ...extra });
  const evt = (event, payment, id = `evt_${Math.random().toString(36).slice(2)}`) => ({ id, event, dateCreated: '2026-11-16 10:00:00', payment });
  const payment = (subId, over = {}) => ({ object: 'payment', id: 'pay_001', customer: 'cus_001', subscription: subId, value: 9.99, billingType: 'PIX', status: 'RECEIVED', paymentDate: '2026-11-16', ...over });

  it('checkout cria cliente e assinatura no Asaas, aplica a promoção na primeira contratação e devolve o link de pagamento', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const r = await checkout(u, { billingType: 'PIX' });
    assert.equal(r.status, 200);
    assert.equal(r.body.checkoutUrl, 'https://sandbox.asaas.com/i/abc123');
    assert.equal(r.body.promoApplied, true);
    assert.equal(r.body.amountCents, 999);
    const sub = await prisma.subscription.findUnique({ where: { id: r.body.subscriptionId } });
    assert.deepEqual([sub.status, sub.source, sub.priceCents], ['PENDENTE', 'GATEWAY', 999]);
    assert.ok(sub.gatewayRef.startsWith('sub_'));
    assert.equal((await prisma.billingCustomer.findUnique({ where: { userId: u.user.id } })).gatewayCustomerId, 'cus_001');
    const created = fake.calls.find((c) => c.path === '/subscriptions' && c.method === 'POST').body;
    assert.deepEqual([created.value, created.billingType, created.externalReference], [9.99, 'PIX', sub.id]);
    // nada de dados sensíveis persistidos
    assert.doesNotMatch(JSON.stringify(await prisma.billingCustomer.findMany()) + JSON.stringify(sub), /52998224725|529\.982/);
    // enquanto pendente, o usuário continua no FREE
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.plan.code, 'FREE');
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.pending.planCode, 'PRO');
    assert.equal((await api().get('/api/subscriptions/me/pending-link').set(bearer(u.token))).body.checkoutUrl, 'https://sandbox.asaas.com/i/abc123');
  });

  it('exige CPF/CNPJ válido; erro do gateway não deixa assinatura pendente órfã', async () => {
    const u = await tokenFor('PROFISSIONAL');
    assert.equal((await api().post('/api/subscriptions/me/change').set(bearer(u.token)).send({ planCode: 'PRO' })).status, 400);
    assert.equal((await checkout(u, { cpfCnpj: '123.456.789-00' })).status, 400);
    assert.equal((await checkout(u, { billingType: 'DINHEIRO' })).status, 400);
    const { gateway } = fakeAsaas({ failOn: /POST \/subscriptions/ });
    setGatewayForTests(gateway);
    const r = await checkout(u);
    assert.equal(r.status, 400);
    assert.equal(await prisma.subscription.count({ where: { status: 'PENDENTE' } }), 0, 'checkout falho é cancelado localmente');
  });

  it('reiniciar o checkout cancela o pendente anterior no gateway (sem cobranças duplicadas)', async () => {
    const u = await tokenFor('PROFISSIONAL');
    await checkout(u); await checkout(u);
    assert.equal(fake.calls.filter((c) => c.method === 'DELETE').length, 1);
    assert.equal(await prisma.subscription.count({ where: { status: 'PENDENTE' } }), 1);
  });

  it('webhook exige o token; token errado ou ausente → 401 e nada é alterado', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    const body = evt('PAYMENT_RECEIVED', payment(sub.gatewayRef));
    assert.equal((await hook(body, 'errado')).status, 401);
    assert.equal((await api().post('/api/billing/webhook/asaas').send(body)).status, 401);
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } })).status, 'PENDENTE');
    assert.equal(await prisma.payment.count(), 0);
  });

  it('pagamento confirmado ativa o plano, registra o pagamento e libera os benefícios; auditoria sem ator', async () => {
    await prisma.plan.update({ where: { code: 'FREE' }, data: { limits: { simulationsPerMonth: 0 } } });
    await prisma.plan.update({ where: { code: 'PRO' }, data: { limits: { simulationsPerMonth: null } } });
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    const sim = () => api().post('/api/simulations').set(bearer(u.token)).send({ name: 'Cenário', iterations: 1000, inputs: { ticket: 80, expectedClients: 10, workDaysPerMonth: 20, servicesPerDay: 3 } });
    assert.equal((await sim()).status, 403, 'antes do pagamento vale o FREE');
    const r = await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef)));
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { processed: true });
    const me = (await api().get('/api/subscriptions/me').set(bearer(u.token))).body;
    assert.equal(me.plan.code, 'PRO');
    assert.equal(me.subscription.status, 'ATIVA');
    assert.equal(me.pending, null);
    assert.equal(me.payments[0].amountCents, 999);
    assert.equal(me.payments[0].status, 'PAGO');
    assert.equal((await sim()).status, 201, 'benefícios do PRO liberados');
    const log = await prisma.auditLog.findFirst({ where: { action: 'SUBSCRIPTION_ACTIVATED' } });
    assert.equal(log.actorId, null);
  });

  it('idempotência: o mesmo evento repetido não duplica pagamento nem reprocessa', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    const ev = evt('PAYMENT_RECEIVED', payment(sub.gatewayRef), 'evt_fixo');
    assert.deepEqual((await hook(ev)).body, { processed: true });
    assert.deepEqual((await hook(ev)).body, { duplicate: true });
    assert.equal(await prisma.payment.count(), 1);
    assert.equal(await prisma.webhookEvent.count(), 1);
    // eventos diferentes da MESMA cobrança atualizam o mesmo registro (CONFIRMED depois de RECEIVED não regride)
    await hook(evt('PAYMENT_CONFIRMED', payment(sub.gatewayRef)));
    await hook(evt('PAYMENT_CREATED', payment(sub.gatewayRef)));
    assert.equal(await prisma.payment.count(), 1);
    assert.equal((await prisma.payment.findFirst()).status, 'PAGO', 'evento mais antigo não rebaixa um pagamento já pago');
  });

  it('inadimplência suspende o plano (volta ao FREE) e o pagamento posterior reativa', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef, { id: 'pay_001' })));
    await hook(evt('PAYMENT_OVERDUE', payment(sub.gatewayRef, { id: 'pay_002', status: 'OVERDUE', value: 9.99 })));
    const suspended = (await api().get('/api/subscriptions/me').set(bearer(u.token))).body;
    assert.equal(suspended.plan.code, 'FREE');
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } })).status, 'EXPIRADA');
    assert.equal((await prisma.payment.findUnique({ where: { gatewayRef: 'pay_002' } })).status, 'FALHOU');
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef, { id: 'pay_002' })));
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.plan.code, 'PRO');
    assert.equal((await prisma.payment.findUnique({ where: { gatewayRef: 'pay_002' } })).status, 'PAGO');
  });

  it('reembolso marca o pagamento; assinatura cancelada/inativada no Asaas encerra o plano', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef)));
    await hook(evt('PAYMENT_REFUNDED', payment(sub.gatewayRef, { status: 'REFUNDED' })));
    assert.equal((await prisma.payment.findFirst()).status, 'REEMBOLSADO');
    await hook({ id: 'evt_sub_del', event: 'SUBSCRIPTION_DELETED', subscription: { id: sub.gatewayRef, object: 'subscription' } });
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } })).status, 'CANCELADA');
    assert.equal((await api().get('/api/subscriptions/me').set(bearer(u.token))).body.plan.code, 'FREE');
  });

  it('promoção: após os 3 meses pagos, o valor da assinatura passa ao preço cheio no Asaas', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    for (const n of [1, 2]) await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef, { id: `pay_m${n}` })));
    assert.equal(fake.calls.filter((c) => c.method === 'PUT' && c.path === `/subscriptions/${sub.gatewayRef}`).length, 0, 'ainda na promoção');
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef, { id: 'pay_m3' })));
    const put = fake.calls.filter((c) => c.method === 'PUT' && c.path === `/subscriptions/${sub.gatewayRef}`);
    assert.equal(put.length, 1);
    assert.deepEqual([put[0].body.value, put[0].body.updatePendingPayments], [14.9, true]);
    const after = await prisma.subscription.findUnique({ where: { id: sub.id } });
    assert.deepEqual([after.priceCents, after.promoEndsAt !== null], [1490, true]);
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef, { id: 'pay_m4', value: 14.9 })));
    assert.equal(fake.calls.filter((c) => c.method === 'PUT' && c.path === `/subscriptions/${sub.gatewayRef}`).length, 1, 'não repete');
  });

  it('quem já pagou antes não recebe a promoção de novo; contratação ativa encerra a concessão manual', async () => {
    const admin = await tokenFor('ADMIN'), u = await tokenFor('PROFISSIONAL');
    const manual = (await api().post('/api/subscriptions/admin/grant').set(bearer(admin.token)).send({ userId: u.user.id, planCode: 'PRO' })).body;
    const first = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    await hook(evt('PAYMENT_RECEIVED', payment(first.gatewayRef)));
    assert.equal((await prisma.subscription.findUnique({ where: { id: manual.id } })).status, 'CANCELADA', 'a concessão manual dá lugar à assinatura paga');
    await api().post('/api/subscriptions/me/cancel').set(bearer(u.token));
    assert.equal(fake.calls.filter((c) => c.method === 'DELETE').length >= 1, true, 'cancelamento chega ao Asaas');
    const second = await checkout(u);
    assert.equal(second.body.promoApplied, false);
    assert.equal(second.body.amountCents, 1490);
  });

  it('cobrança sem assinatura local é ignorada e registrada como alerta; evento sem tipo é ignorado', async () => {
    assert.equal((await hook(evt('PAYMENT_RECEIVED', payment('sub_desconhecida')))).status, 200);
    assert.equal(await prisma.payment.count(), 0);
    assert.ok(await prisma.systemEvent.findFirst({ where: { source: 'asaas', level: 'warn' } }));
    assert.deepEqual((await hook({})).body, { ignored: true });
  });

  it('cancelamento pelo usuário: chama o Asaas e volta ao FREE; troca para FREE cancela a paga', async () => {
    const u = await tokenFor('PROFISSIONAL');
    const sub = await prisma.subscription.findUnique({ where: { id: (await checkout(u)).body.subscriptionId } });
    await hook(evt('PAYMENT_RECEIVED', payment(sub.gatewayRef)));
    const r = await api().post('/api/subscriptions/me/change').set(bearer(u.token)).send({ planCode: 'FREE' });
    assert.equal(r.status, 200);
    assert.ok(fake.calls.some((c) => c.method === 'DELETE' && c.path === `/subscriptions/${sub.gatewayRef}`));
    assert.equal((await prisma.subscription.findUnique({ where: { id: sub.id } })).status, 'CANCELADA');
  });

  it('com a cobrança desativada nada acontece (padrão do produto)', async () => {
    setGatewayForTests(null);
    const u = await tokenFor('PROFISSIONAL');
    const r = await checkout(u);
    assert.equal(r.status, 409);
    assert.equal(r.body.erro.codigo, 'BILLING_DISABLED');
    assert.equal(await prisma.subscription.count(), 0);
    assert.equal((await hook(evt('PAYMENT_RECEIVED', payment('sub_x')))).status, 401, 'webhook recusado sem gateway configurado');
  });
});

describe('prontidão do Asaas (painel administrativo)', () => {
  beforeEach(async () => { await resetDb(); await seedPlans(prisma); setGatewayForTests(null); });
  after(async () => { setGatewayForTests(null); await prisma.$disconnect(); });

  it('somente administradores veem o estado e o checklist do que falta configurar', async () => {
    const pro = await tokenFor('PROFISSIONAL'), admin = await tokenFor('ADMIN');
    assert.equal((await api().get('/api/billing/status')).status, 401);
    assert.equal((await api().get('/api/billing/status').set(bearer(pro.token))).status, 403);
    const s = (await api().get('/api/billing/status').set(bearer(admin.token))).body;
    assert.equal(s.gateway, 'asaas');
    assert.equal(s.enabled, false);
    assert.equal(s.ready, false);
    assert.equal(s.webhookPath, '/api/billing/webhook/asaas');
    assert.deepEqual(s.checks.map((c) => [c.id, c.ok]), [['apiKey', false], ['webhookToken', false], ['environment', true], ['enabled', false]]);
    assert.doesNotMatch(JSON.stringify(s), /chave-de-teste|token-de-webhook/, 'segredos nunca são expostos');
  });

  it('teste de conexão: falha clara sem credenciais, ok com o gateway configurado', async () => {
    const admin = await tokenFor('ADMIN');
    const off = await api().post('/api/billing/test-connection').set(bearer(admin.token));
    assert.equal(off.status, 409);
    setGatewayForTests(fakeAsaas().gateway);
    assert.deepEqual((await api().post('/api/billing/test-connection').set(bearer(admin.token))).body, { ok: true });
  });
});
