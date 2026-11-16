import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { isValidCnpj } from '../../utils/cnpj.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';

const company = (over = {}) => ({ tradeName: 'Padaria Boa', city: 'Volta Redonda', phone: '(24) 3333-4444', responsibleName: 'Carlos', cnpj: '11.222.333/0001-81', ...over });
const future = (days = 30) => new Date(Date.now() + days * 86400_000).toISOString();
const opp = (categoryId, over = {}) => ({
  title: 'Preciso de eletricista', description: 'Troca de fiação em padaria, serviço de dois dias.', categoryId,
  city: 'Volta Redonda', mode: 'PRESENCIAL', deadline: future(), contractType: 'PONTUAL', contactChannel: 'contato@padaria.com', payMin: 300, payMax: 600, ...over,
});

async function setup() {
  const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
  const emp = await tokenFor('EMPRESA');
  await api().put('/api/companies/me').set(bearer(emp.token)).send(company());
  const admin = await tokenFor('ADMIN');
  return { cat, emp, admin };
}
const post = (token, body) => api().post('/api/opportunities').set(bearer(token)).send(body);
const review = (token, id, body) => api().post(`/api/opportunities/admin/${id}/review`).set(bearer(token)).send(body);
async function approvedPro() {
  const cat = await prisma.category.create({ data: { name: 'Pintor', slug: 'pintor' } });
  const pro = await tokenFor('PROFISSIONAL');
  const p = await api().put('/api/professionals/me').set(bearer(pro.token)).send({
    displayName: 'Ana Pro', categoryId: cat.id, description: 'Pinturas e reparos em geral na região.', city: 'Volta Redonda', mode: 'PRESENCIAL',
    radiusKm: 10, whatsapp: '24988887777', showContact: false, services: [{ name: 'Pintura' }],
  });
  await prisma.professional.update({ where: { id: p.body.id }, data: { status: 'APROVADO', approvedAt: new Date() } });
  return pro;
}

describe('empresas e oportunidades', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('valida CNPJ', () => {
    assert.equal(isValidCnpj('11.222.333/0001-81'), true);
    assert.equal(isValidCnpj('11.222.333/0001-80'), false);
    assert.equal(isValidCnpj('00000000000000'), false);
  });

  it('empresa: cria perfil, valida CNPJ, impede CNPJ duplicado e acesso de outros papéis', async () => {
    const emp = await tokenFor('EMPRESA');
    const put = (t, b) => api().put('/api/companies/me').set(bearer(t)).send(b);
    assert.equal((await put(emp.token, company({ cnpj: '11.222.333/0001-80' }))).status, 400);
    assert.equal((await put(emp.token, company())).status, 200);
    const other = await tokenFor('EMPRESA');
    assert.equal((await put(other.token, company())).status, 409);
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await put(pro.token, company())).status, 403);
  });

  it('exige perfil empresarial; publicação entra PENDENTE e não aparece no catálogo', async () => {
    const cat = await prisma.category.create({ data: { name: 'X Cat', slug: 'x-cat' } });
    const semPerfil = await tokenFor('EMPRESA');
    assert.equal((await post(semPerfil.token, opp(cat.id))).status, 400);
    const { cat: c2, emp } = await setup();
    const r = await post(emp.token, opp(c2.id));
    assert.equal(r.status, 201);
    assert.equal(r.body.status, 'PENDENTE');
    assert.equal((await api().get('/api/opportunities')).body.total, 0);
    assert.equal((await api().get(`/api/opportunities/${r.body.id}`)).status, 404);
  });

  it('valida prazo futuro, faixa de remuneração e papel', async () => {
    const { cat, emp } = await setup();
    assert.equal((await post(emp.token, opp(cat.id, { deadline: '2020-01-01' }))).status, 400);
    assert.equal((await post(emp.token, opp(cat.id, { payMin: 900, payMax: 100 }))).status, 400);
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await post(pro.token, opp(cat.id))).status, 403);
  });

  it('aprovação publica; catálogo é público e não vaza contato nem dados privados', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    assert.equal((await review(admin.token, o.id, { action: 'APROVAR' })).body.status, 'PUBLICADA');
    const list = await api().get('/api/opportunities');
    assert.equal(list.body.total, 1);
    const item = list.body.items[0];
    assert.equal(item.contactChannel, undefined);
    assert.equal(item.flags, undefined);
    assert.equal(item.company.cnpj, undefined);
    assert.equal(item.company.tradeName, 'Padaria Boa');
    const d = await api().get(`/api/opportunities/${o.id}`);
    assert.equal(d.status, 200);
    assert.equal(d.body.contactChannel, undefined);
  });

  it('rejeição exige motivo; edição volta para PENDENTE (reaprovação)', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    assert.equal((await review(admin.token, o.id, { action: 'REJEITAR' })).status, 400);
    await review(admin.token, o.id, { action: 'REJEITAR', reason: 'Descrição vaga' });
    const mine = await api().get('/api/opportunities/mine').set(bearer(emp.token));
    assert.equal(mine.body[0].rejectionReason, 'Descrição vaga');
    await review(admin.token, o.id, { action: 'APROVAR' });
    const edited = await api().put(`/api/opportunities/${o.id}`).set(bearer(emp.token)).send(opp(cat.id, { title: 'Eletricista com urgência' }));
    assert.equal(edited.body.status, 'PENDENTE');
    assert.equal((await api().get('/api/opportunities')).body.total, 0);
  });

  it('empresa só edita/encerra as próprias oportunidades; encerrada sai do catálogo e não edita', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    await review(admin.token, o.id, { action: 'APROVAR' });
    const outra = await tokenFor('EMPRESA');
    await api().put('/api/companies/me').set(bearer(outra.token)).send(company({ cnpj: undefined, tradeName: 'Outra' }));
    assert.equal((await api().post(`/api/opportunities/${o.id}/close`).set(bearer(outra.token))).status, 404);
    assert.equal((await api().put(`/api/opportunities/${o.id}`).set(bearer(outra.token)).send(opp(cat.id))).status, 404);
    assert.equal((await api().post(`/api/opportunities/${o.id}/close`).set(bearer(emp.token))).body.status, 'ENCERRADA');
    assert.equal((await api().get('/api/opportunities')).body.total, 0);
    assert.equal((await api().put(`/api/opportunities/${o.id}`).set(bearer(emp.token)).send(opp(cat.id))).status, 400);
  });

  it('expiradas saem do catálogo, são marcadas na lista da empresa e não podem receber interesse', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    await review(admin.token, o.id, { action: 'APROVAR' });
    await prisma.opportunity.update({ where: { id: o.id }, data: { deadline: new Date(Date.now() - 1000) } });
    assert.equal((await api().get('/api/opportunities')).body.total, 0);
    assert.equal((await api().get('/api/opportunities/mine').set(bearer(emp.token))).body[0].expired, true);
    const pro = await approvedPro();
    assert.equal((await api().post(`/api/opportunities/${o.id}/interest`).set(bearer(pro.token)).send({})).status, 404);
    const o2 = (await post(emp.token, opp(cat.id, { title: 'Outra vaga aberta' }))).body;
    await prisma.opportunity.update({ where: { id: o2.id }, data: { deadline: new Date(Date.now() - 1000) } });
    assert.equal((await review(admin.token, o2.id, { action: 'APROVAR' })).status, 400);
  });

  it('interesse: só profissional aprovado; revela contato; empresa vê interessados respeitando autorização', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    await review(admin.token, o.id, { action: 'APROVAR' });
    const url = `/api/opportunities/${o.id}/interest`;

    const pendente = await tokenFor('PROFISSIONAL');
    assert.equal((await api().post(url).set(bearer(pendente.token)).send({})).status, 403);
    assert.equal((await api().post(url).send({})).status, 401);
    assert.equal((await api().post(url).set(bearer(emp.token)).send({})).status, 403);

    const pro = await approvedPro();
    assert.equal((await api().get(`/api/opportunities/${o.id}`).set(bearer(pro.token))).body.contactChannel, undefined);
    const ok = await api().post(url).set(bearer(pro.token)).send({ message: 'Posso começar segunda' });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.contactChannel, 'contato@padaria.com');
    await api().post(url).set(bearer(pro.token)).send({ message: 'Atualizado' });
    assert.equal(await prisma.interest.count(), 1, 'sem duplicidade');
    const det = await api().get(`/api/opportunities/${o.id}`).set(bearer(pro.token));
    assert.equal(det.body.contactChannel, 'contato@padaria.com');
    assert.equal(det.body.myInterest.message, 'Atualizado');

    const list = await api().get(`/api/opportunities/${o.id}/interests`).set(bearer(emp.token));
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].professional.displayName, 'Ana Pro');
    assert.equal(list.body[0].professional.contact, null, 'showContact=false');
    assert.equal(list.body[0].professional.whatsapp, undefined);
    const outra = await tokenFor('EMPRESA');
    assert.equal((await api().get(`/api/opportunities/${o.id}/interests`).set(bearer(outra.token))).status, 404);

    const mine = await api().get('/api/opportunities/interests/mine').set(bearer(pro.token));
    assert.equal(mine.body[0].opportunity.title, 'Preciso de eletricista');
    assert.equal((await api().delete(url).set(bearer(pro.token))).status, 204);
    assert.equal(await prisma.interest.count(), 0);
  });

  it('sinaliza anúncios suspeitos e limita pendentes por empresa', async () => {
    const { cat, emp, admin } = await setup();
    const sus = (await post(emp.token, opp(cat.id, { description: 'Ganhe muito! Faça o pagamento antecipado do kit inicial via bit.ly/abc' }))).body;
    assert.deepEqual(sus.flags.sort(), ['LINK_ENCURTADO', 'PAGAMENTO_ANTECIPADO']);
    const adminList = await api().get('/api/opportunities/admin/list?status=PENDENTE').set(bearer(admin.token));
    assert.ok(adminList.body.items[0].flags.includes('LINK_ENCURTADO'));
    for (let i = 0; i < 4; i++) assert.equal((await post(emp.token, opp(cat.id, { title: `Vaga número ${i}` }))).status, 201);
    assert.equal((await post(emp.token, opp(cat.id, { title: 'Vaga excedente' }))).status, 409);
  });

  it('empresa suspensa não publica e suas oportunidades somem do catálogo', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    await review(admin.token, o.id, { action: 'APROVAR' });
    const companies = await api().get('/api/companies/admin/list').set(bearer(admin.token));
    const cid = companies.body.items[0].id;
    assert.equal((await api().patch(`/api/companies/admin/${cid}`).set(bearer(admin.token)).send({ status: 'SUSPENSA' })).body.status, 'SUSPENSA');
    assert.equal((await api().get('/api/opportunities')).body.total, 0);
    assert.equal((await post(emp.token, opp(cat.id, { title: 'Tentando de novo' }))).status, 403);
  });

  it('moderação: papéis sem permissão barrados; filtros do catálogo funcionam; auditoria registra', async () => {
    const { cat, emp, admin } = await setup();
    const o = (await post(emp.token, opp(cat.id))).body;
    const pro = await tokenFor('PROFISSIONAL');
    assert.equal((await review(pro.token, o.id, { action: 'APROVAR' })).status, 403);
    assert.equal((await api().get('/api/opportunities/admin/list').set(bearer(emp.token))).status, 403);
    const mod = await tokenFor('MODERADOR');
    assert.equal((await review(mod.token, o.id, { action: 'APROVAR' })).status, 200);
    const q = async (qs) => (await api().get(`/api/opportunities?${qs}`)).body.total;
    assert.equal(await q('q=fiação'), 1);
    assert.equal(await q('category=eletricista'), 1);
    assert.equal(await q('category=pintor'), 0);
    assert.equal(await q('city=volta%20redonda'), 1);
    assert.equal(await q('contractType=VAGA_FIXA'), 0);
    const log = await api().get(`/api/audit?entity=Opportunity&entityId=${o.id}`).set(bearer(admin.token));
    assert.deepEqual(log.body.items.map((i) => i.action).sort(), ['OPPORTUNITY_APROVAR', 'OPPORTUNITY_SUBMIT']);
  });
});
