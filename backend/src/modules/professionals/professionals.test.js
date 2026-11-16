import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const profile = (categoryId, over = {}) => ({
  displayName: 'João Eletricista', categoryId, headline: 'Instalações residenciais',
  description: 'Instalações elétricas residenciais e comerciais, com garantia.',
  city: 'Volta Redonda', neighborhood: 'Aterrado', mode: 'PRESENCIAL', radiusKm: 15,
  whatsapp: '(24) 99999-1234', showContact: false,
  services: [{ name: 'Troca de fiação' }, { name: 'Quadro de luz', priceInfo: 'a partir de R$ 200' }],
  areas: [{ city: 'Barra Mansa', radiusKm: 10, lat: -22.54, lng: -44.17 }],
  portfolio: [{ type: 'IMAGEM', url: 'https://exemplo.com/foto.jpg', caption: 'Obra' }],
  ...over,
});

async function setup() {
  const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
  const pro = await tokenFor('PROFISSIONAL');
  const admin = await tokenFor('ADMIN');
  return { cat, pro, admin };
}
const submit = (token, body) => api().put('/api/professionals/me').set(bearer(token)).send(body);

describe('marketplace de profissionais', () => {
  beforeEach(async () => { await resetDb(); });
  after(() => prisma.$disconnect());

  it('profissional cria perfil → fica PENDENTE e não aparece no catálogo', async () => {
    const { cat, pro } = await setup();
    const res = await submit(pro.token, profile(cat.id));
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'PENDENTE');
    assert.equal(res.body.slug, 'joao-eletricista');
    assert.equal(res.body.whatsapp, '24999991234');
    assert.equal((await api().get('/api/professionals')).body.total, 0);
    assert.equal((await api().get('/api/professionals/joao-eletricista')).status, 404);
  });

  it('só PROFISSIONAL edita perfil; valida dados', async () => {
    const { cat } = await setup();
    const emp = await tokenFor('EMPRESA');
    assert.equal((await submit(emp.token, profile(cat.id))).status, 403);
    assert.equal((await api().put('/api/professionals/me').send(profile(cat.id))).status, 401);
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await submit(pro.token, profile(cat.id, { whatsapp: '123' }))).status, 400);
    assert.equal((await submit(pro.token, profile(cat.id, { services: [] }))).status, 400);
    assert.equal((await submit(pro.token, profile(cat.id, { portfolio: [{ type: 'IMAGEM', url: 'javascript:alert(1)' }] }))).status, 400);
    assert.equal((await submit(pro.token, profile('00000000-0000-4000-8000-000000000000'))).status, 400);
  });

  it('fluxo completo: aprovar → aparece no catálogo sem dados privados', async () => {
    const { cat, pro, admin } = await setup();
    const created = await submit(pro.token, profile(cat.id));
    const r = await api().post(`/api/professionals/admin/${created.body.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    assert.equal(r.status, 200);
    const list = await api().get('/api/professionals');
    assert.equal(list.body.total, 1);
    const item = list.body.items[0];
    assert.equal(item.contact, null, 'contato só com autorização');
    assert.equal(item.userId, undefined);
    assert.equal(item.whatsapp, undefined);
    assert.equal(item.rejectionReason, undefined);
    const detail = await api().get('/api/professionals/joao-eletricista');
    assert.equal(detail.status, 200);
    assert.equal(detail.body.services.length, 2);
    assert.equal(detail.body.areas[0].lat, undefined);
  });

  it('contato público só aparece com showContact=true', async () => {
    const { cat, pro, admin } = await setup();
    const c = await submit(pro.token, profile(cat.id, { showContact: true, otherContacts: 'joao@exemplo.com' }));
    await api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    const d = await api().get('/api/professionals/joao-eletricista');
    assert.equal(d.body.contact.whatsapp, '24999991234');
  });

  it('rejeição exige motivo, mostra ao profissional e reenvio volta para a fila', async () => {
    const { cat, pro, admin } = await setup();
    const c = await submit(pro.token, profile(cat.id));
    const url = `/api/professionals/admin/${c.body.id}/review`;
    assert.equal((await api().post(url).set(bearer(admin.token)).send({ action: 'REJEITAR' })).status, 400);
    await api().post(url).set(bearer(admin.token)).send({ action: 'REJEITAR', reason: 'Descrição insuficiente' });
    const mine = await api().get('/api/professionals/me').set(bearer(pro.token));
    assert.equal(mine.body.status, 'REJEITADO');
    assert.equal(mine.body.rejectionReason, 'Descrição insuficiente');
    const again = await submit(pro.token, profile(cat.id, { description: 'Descrição agora bem mais completa e detalhada.' }));
    assert.equal(again.body.status, 'PENDENTE');
    assert.equal(again.body.rejectionReason, null);
  });

  it('ocultar remove do catálogo; reexibir devolve; transições inválidas são barradas', async () => {
    const { cat, pro, admin } = await setup();
    const c = await submit(pro.token, profile(cat.id));
    const act = (action) => api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(admin.token)).send({ action });
    assert.equal((await act('OCULTAR')).status, 400); // pendente não oculta
    await act('APROVAR');
    await act('OCULTAR');
    assert.equal((await api().get('/api/professionals')).body.total, 0);
    await act('REEXIBIR');
    assert.equal((await api().get('/api/professionals')).body.total, 1);
  });

  it('edição de perfil aprovado mantém status e registra auditoria', async () => {
    const { cat, pro, admin } = await setup();
    const c = await submit(pro.token, profile(cat.id));
    await api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    const upd = await submit(pro.token, profile(cat.id, { services: [{ name: 'Só um serviço' }] }));
    assert.equal(upd.body.status, 'APROVADO');
    assert.equal(upd.body.services.length, 1);
    const log = await api().get(`/api/audit?entity=Professional&entityId=${c.body.id}`).set(bearer(admin.token));
    assert.deepEqual(log.body.items.map((i) => i.action).sort(), ['PROFESSIONAL_APROVAR', 'PROFESSIONAL_SUBMIT', 'PROFESSIONAL_UPDATE']);
  });

  it('busca e filtros: nome, serviço, categoria, cidade, bairro e região atendida', async () => {
    const { cat, admin } = await setup();
    const cat2 = await prisma.category.create({ data: { name: 'Pintor', slug: 'pintor' } });
    const a = await tokenFor('PROFISSIONAL');
    const b = await tokenFor('PROFISSIONAL');
    const pa = await submit(a.token, profile(cat.id));
    const pb = await submit(b.token, profile(cat2.id, {
      displayName: 'Ana Pinturas', city: 'Resende', neighborhood: 'Centro', areas: [], services: [{ name: 'Pintura de fachada' }],
    }));
    for (const p of [pa, pb]) await api().post(`/api/professionals/admin/${p.body.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    const q = async (qs) => (await api().get(`/api/professionals?${qs}`)).body.items.map((i) => i.displayName);
    assert.deepEqual(await q('q=fachada'), ['Ana Pinturas']);
    assert.deepEqual(await q('q=ana'), ['Ana Pinturas']);
    assert.deepEqual(await q('category=eletricista'), ['João Eletricista']);
    assert.deepEqual(await q('city=resende'), ['Ana Pinturas']);
    assert.deepEqual(await q('city=barra%20mansa'), ['João Eletricista']); // região atendida
    assert.deepEqual(await q('neighborhood=centro'), ['Ana Pinturas']);
    assert.deepEqual(await q('q=inexistente'), []);
  });

  it('destaque: só aprovados; admin edita informações públicas; ocultar remove destaque', async () => {
    const { cat, pro, admin } = await setup();
    const c = await submit(pro.token, profile(cat.id));
    const patch = (b) => api().patch(`/api/professionals/admin/${c.body.id}`).set(bearer(admin.token)).send(b);
    assert.equal((await patch({ featured: true })).status, 400);
    await api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
    const r = await patch({ featured: true, headline: 'Novo título' });
    assert.equal(r.body.featured, true);
    assert.equal((await api().get('/api/professionals')).body.items[0].headline, 'Novo título');
    await api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(admin.token)).send({ action: 'OCULTAR' });
    assert.equal((await prisma.professional.findUnique({ where: { id: c.body.id } })).featured, false);
  });

  it('moderador modera mas não edita; demais papéis não acessam a administração', async () => {
    const { cat, pro } = await setup();
    const c = await submit(pro.token, profile(cat.id));
    const mod = await tokenFor('MODERADOR');
    assert.equal((await api().post(`/api/professionals/admin/${c.body.id}/review`).set(bearer(mod.token)).send({ action: 'APROVAR' })).status, 200);
    assert.equal((await api().patch(`/api/professionals/admin/${c.body.id}`).set(bearer(mod.token)).send({ featured: true })).status, 403);
    assert.equal((await api().get('/api/professionals/admin/list').set(bearer(pro.token))).status, 403);
    assert.equal((await api().get('/api/professionals/admin/list')).status, 401);
  });

  it('coluna PostGIS é gerada a partir de lat/lng e permite consulta por distância', async () => {
    const { cat, pro } = await setup();
    await submit(pro.token, profile(cat.id));
    const rows = await prisma.$queryRaw`
      SELECT count(*)::int AS n FROM "ServiceArea"
      WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(-44.10, -22.52), 4326)::geography, 20000)`;
    assert.equal(rows[0].n, 1);
  });

  it('solicitações LGPD: abrir (sem duplicar), listar e resolver (admin)', async () => {
    const { pro, admin } = await setup();
    const open = () => api().post('/api/data-requests').set(bearer(pro.token)).send({ type: 'EXCLUSAO', message: 'Quero sair' });
    const first = await open();
    assert.equal(first.status, 201);
    assert.equal((await open()).body.id, first.body.id);
    assert.equal((await api().get('/api/data-requests').set(bearer(pro.token))).status, 403);
    assert.equal((await api().get('/api/data-requests').set(bearer(admin.token))).body.length, 1);
    const done = await api().post(`/api/data-requests/${first.body.id}/resolve`).set(bearer(admin.token));
    assert.equal(done.body.status, 'CONCLUIDA');
  });
});
