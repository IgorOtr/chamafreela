import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

describe('privacidade: exportação dos dados do titular', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('exige autenticação', async () => assert.equal((await api().get('/api/privacy/export')).status, 401));

  it('entrega somente os dados do próprio titular, sem credenciais, como arquivo JSON, e registra auditoria', async () => {
    const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    const me = await tokenFor('PROFISSIONAL');
    const other = await tokenFor('PROFISSIONAL');
    const prof = (t, name) => api().put('/api/professionals/me').set(bearer(t.token)).send({ displayName: name, categoryId: cat.id, description: 'Profissional atendendo a região há anos.', city: 'Volta Redonda', mode: 'PRESENCIAL', radiusKm: 5, whatsapp: '24999990001', services: [{ name: 'Fiação' }] });
    await prof(me, 'Meu Perfil'); await prof(other, 'Perfil de Outra Pessoa');
    await api().post('/api/simulations').set(bearer(me.token)).send({ name: 'Minha simulação', iterations: 1000, inputs: { ticket: 80, expectedClients: 10, workDaysPerMonth: 20, servicesPerDay: 3 } });
    await api().post('/api/simulations').set(bearer(other.token)).send({ name: 'Simulação alheia', iterations: 1000, inputs: { ticket: 80, expectedClients: 10, workDaysPerMonth: 20, servicesPerDay: 3 } });
    await api().post('/api/data-requests').set(bearer(me.token)).send({ type: 'ATUALIZACAO' });

    const r = await api().get('/api/privacy/export').set(bearer(me.token));
    assert.equal(r.status, 200);
    assert.match(r.headers['content-disposition'], /attachment; filename="chamalafree-meus-dados\.json"/);
    assert.match(r.headers['content-type'], /application\/json/);
    assert.equal(r.headers['cache-control'], 'no-store');
    const d = JSON.parse(r.text);
    assert.equal(d.conta.email, me.user.email);
    assert.equal(d.perfilProfissional.displayName, 'Meu Perfil');
    assert.equal(d.perfilProfissional.services.length, 1);
    assert.deepEqual(d.simulacoes.map((s) => s.name), ['Minha simulação']);
    assert.equal(d.solicitacoesLgpd.length, 1);
    assert.equal(d.empresa, null);
    assert.doesNotMatch(r.text, /passwordHash|tokenHash|Perfil de Outra Pessoa|Simulação alheia|\$2[aby]\$/);

    const log = await prisma.auditLog.findFirst({ where: { action: 'DATA_EXPORT', actorId: me.user.id } });
    assert.ok(log);
  });

  it('empresa recebe seus dados e anúncios; cliente recebe só a conta', async () => {
    const cat = await prisma.category.create({ data: { name: 'Pintor', slug: 'pintor' } });
    const emp = await tokenFor('EMPRESA');
    await api().put('/api/companies/me').set(bearer(emp.token)).send({ tradeName: 'Padaria Boa', city: 'Volta Redonda', phone: '2433334444', responsibleName: 'Carlos' });
    await api().post('/api/opportunities').set(bearer(emp.token)).send({ title: 'Pintura da fachada', description: 'Pintura externa de padaria, serviço de dois dias.', categoryId: cat.id, city: 'Volta Redonda', mode: 'PRESENCIAL', deadline: new Date(Date.now() + 5 * 86400_000).toISOString(), contractType: 'PONTUAL', contactChannel: 'x@y.com' });
    const d = (await api().get('/api/privacy/export').set(bearer(emp.token))).body;
    assert.equal(d.empresa.tradeName, 'Padaria Boa');
    assert.equal(d.oportunidadesPublicadasPorMim[0].title, 'Pintura da fachada');
    assert.equal(d.oportunidadesPublicadasPorMim[0].contactChannel, 'x@y.com');
    const cli = await tokenFor('CLIENTE');
    const c = (await api().get('/api/privacy/export').set(bearer(cli.token))).body;
    assert.equal(c.conta.role, 'CLIENTE');
    assert.equal(c.perfilProfissional, null);
    assert.deepEqual(c.simulacoes, []);
  });
});
