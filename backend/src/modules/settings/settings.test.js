import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const MSG = 'Olá! Quero agendar a consultoria do Formaliza.';

describe('configurações do Formaliza (WhatsApp)', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('público: por padrão leva ao WhatsApp +55 24 99946-8823 com mensagem pronta', async () => {
    const r = await api().get('/api/settings/formaliza');
    assert.equal(r.status, 200);
    assert.equal(r.body.ready, true);
    const url = new URL(r.body.url);
    assert.equal(url.origin + url.pathname, 'https://wa.me/5524999468823');
    assert.match(url.searchParams.get('text'), /CHAMALÁ Formaliza/);
    assert.equal(r.body.whatsapp, undefined, 'a resposta pública só traz o link pronto');
  });

  it('só o superadministrador lê e altera', async () => {
    for (const role of ['ADMIN', 'MODERADOR', 'PROFISSIONAL']) {
      const { token } = await tokenFor(role);
      assert.equal((await api().get('/api/settings/formaliza/admin').set(bearer(token))).status, 403, role);
      assert.equal((await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: true, whatsapp: '5524999468823', message: MSG })).status, 403, role);
    }
    assert.equal((await api().get('/api/settings/formaliza/admin')).status, 401);
  });

  it('superadmin troca número (normalizado) e mensagem; o público reflete e a alteração é auditada', async () => {
    const { token, user } = await tokenFor('SUPERADMIN');
    const put = await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: true, whatsapp: '+55 (24) 98888-7777', message: MSG });
    assert.equal(put.status, 200);
    assert.equal(put.body.whatsapp, '5524988887777');
    const url = new URL((await api().get('/api/settings/formaliza')).body.url);
    assert.equal(url.pathname, '/5524988887777');
    assert.equal(url.searchParams.get('text'), MSG);
    const log = await prisma.auditLog.findFirst({ where: { action: 'SETTINGS_UPDATE', actorId: user.id } });
    assert.equal(log.changes.whatsapp.para, '5524988887777');
  });

  it('desligar esconde o link do público, mas o painel continua mostrando', async () => {
    const { token } = await tokenFor('SUPERADMIN');
    await api().put('/api/settings/formaliza/admin').set(bearer(token)).send({ enabled: false, whatsapp: '5524999468823', message: MSG });
    assert.deepEqual((await api().get('/api/settings/formaliza')).body, { ready: false, url: '' });
    assert.equal((await api().get('/api/settings/formaliza/admin').set(bearer(token))).body.whatsapp, '5524999468823');
  });

  it('rejeita número inválido, mensagem curta e tipos errados', async () => {
    const { token } = await tokenFor('SUPERADMIN');
    for (const body of [
      { enabled: true, whatsapp: '999468823', message: MSG },
      { enabled: true, whatsapp: 'abc', message: MSG },
      { enabled: true, whatsapp: '5524999468823', message: 'oi' },
      { enabled: 'sim', whatsapp: '5524999468823', message: MSG },
    ]) {
      assert.equal((await api().put('/api/settings/formaliza/admin').set(bearer(token)).send(body)).status, 400, JSON.stringify(body));
    }
  });
});
