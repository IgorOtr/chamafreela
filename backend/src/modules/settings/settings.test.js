import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const URL_OK = 'https://outlook.office.com/book/consultoria@exemplo.com.br/';

describe('configurações do Formaliza', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('público: sem configuração, agendamento indisponível', async () => {
    const r = await api().get('/api/settings/formaliza');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ready: false, bookingUrl: '' });
  });

  it('só o superadministrador lê e altera', async () => {
    for (const role of ['ADMIN', 'MODERADOR', 'PROFISSIONAL']) {
      const { token } = await tokenFor(role);
      assert.equal((await api().get('/api/settings/formaliza/admin').set(bearer(token))).status, 403, role);
      assert.equal((await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: true, bookingUrl: URL_OK })).status, 403, role);
    }
    assert.equal((await api().get('/api/settings/formaliza/admin')).status, 401);
  });

  it('superadmin ativa com link https, o público passa a receber o link e a alteração é auditada', async () => {
    const { token, user } = await tokenFor('SUPERADMIN');
    const put = await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: true, bookingUrl: URL_OK });
    assert.equal(put.status, 200);
    assert.deepEqual((await api().get('/api/settings/formaliza')).body, { ready: true, bookingUrl: URL_OK });
    const log = await prisma.auditLog.findFirst({ where: { action: 'SETTINGS_UPDATE', actorId: user.id } });
    assert.ok(log);
    assert.equal(log.changes.bookingUrl.para, URL_OK);
  });

  it('desligar esconde o link do público, mas o painel continua mostrando', async () => {
    const { token } = await tokenFor('SUPERADMIN');
    await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: true, bookingUrl: URL_OK });
    await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: false, bookingUrl: URL_OK });
    assert.deepEqual((await api().get('/api/settings/formaliza')).body, { ready: false, bookingUrl: '' });
    assert.equal((await api().get('/api/settings/formaliza/admin').set(bearer(token))).body.bookingUrl, URL_OK);
  });

  it('rejeita link inseguro, malformado ou ativação sem link', async () => {
    const { token } = await tokenFor('SUPERADMIN');
    for (const body of [
      { enabled: true, bookingUrl: 'http://exemplo.com/agenda' },
      { enabled: true, bookingUrl: 'javascript:alert(1)' },
      { enabled: true, bookingUrl: 'https://a b.com' },
      { enabled: true, bookingUrl: '' },
      { enabled: 'sim', bookingUrl: URL_OK },
    ]) {
      assert.equal((await api().put('/api/settings/formaliza/admin').set(bearer(token)).send(body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: false, bookingUrl: '' })).status, 200);
  });
});
