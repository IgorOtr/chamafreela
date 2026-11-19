import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { prisma } from '../../database/prisma.js';
import { api, bearer, resetDb, tokenFor } from '../../test/helpers.js';
import { seedPlans } from './defaults.js';

describe('planos públicos', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('lista planos ativos sem autenticação, na ordem, com condições do CLAUDE.md', async () => {
    await seedPlans(prisma);
    const r = await api().get('/api/plans');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.map((p) => p.code), ['FREE', 'PRO']);
    const [free, pro] = r.body;
    assert.equal(free.priceCents, 0);
    assert.equal(free.available, true);
    assert.equal(pro.priceCents, 1490);
    assert.equal(pro.promoPriceCents, 999);
    assert.equal(pro.promoMonths, 3);
    assert.equal(pro.available, false, 'cobrança real não está ativada');
    assert.ok(pro.features.length >= 3 && free.features.length >= 3);
    assert.equal(r.body[0].id, undefined);
  });

  it('seed é idempotente e não sobrescreve ajustes feitos pela administração', async () => {
    await seedPlans(prisma);
    await prisma.plan.update({ where: { code: 'PRO' }, data: { priceCents: 1990 } });
    await seedPlans(prisma);
    assert.equal(await prisma.plan.count(), 2);
    assert.equal((await prisma.plan.findUnique({ where: { code: 'PRO' } })).priceCents, 1990);
  });

  it('planos inativos não aparecem; sem planos retorna lista vazia', async () => {
    assert.deepEqual((await api().get('/api/plans')).body, []);
    await seedPlans(prisma);
    await prisma.plan.update({ where: { code: 'PRO' }, data: { active: false } });
    assert.deepEqual((await api().get('/api/plans')).body.map((p) => p.code), ['FREE']);
  });
});

describe('SEO: robots.txt e sitemap.xml', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('robots.txt bloqueia áreas privadas e aponta o sitemap', async () => {
    for (const path of ['/robots.txt', '/api/robots.txt']) {
      const r = await api().get(path);
      assert.equal(r.status, 200);
      assert.match(r.headers['content-type'], /text\/plain/);
      assert.match(r.text, /Disallow: \/painel/);
      assert.match(r.text, /Disallow: \/api/);
      assert.match(r.text, /Sitemap: http:\/\/localhost:5173\/sitemap\.xml/);
    }
  });

  it('sitemap inclui páginas fixas e SÓ conteúdo público vigente', async () => {
    const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    const admin = await tokenFor('ADMIN');
    const pro = async (name, approve) => {
      const t = await tokenFor('PROFISSIONAL');
      const r = await api().put('/api/professionals/me').set(bearer(t.token)).send({ displayName: name, categoryId: cat.id, description: 'Profissional atendendo a região há anos.', city: 'Volta Redonda', mode: 'PRESENCIAL', radiusKm: 5, whatsapp: '24999990000', services: [{ name: 'Serviço' }] });
      if (approve) await prisma.professional.update({ where: { id: r.body.id }, data: { status: 'APROVADO', approvedAt: new Date() } });
      return r.body.slug;
    };
    const ok = await pro('Pro Aprovado', true);
    const pending = await pro('Pro Pendente', false);
    const emp = await tokenFor('EMPRESA');
    await api().put('/api/companies/me').set(bearer(emp.token)).send({ tradeName: 'Padaria <&> Boa', city: 'Volta Redonda', phone: '2433334444', responsibleName: 'Carlos' });
    const mk = async (title, review, past) => {
      const o = (await api().post('/api/opportunities').set(bearer(emp.token)).send({ title, description: 'Serviço de instalação elétrica na padaria.', categoryId: cat.id, city: 'Volta Redonda', mode: 'PRESENCIAL', deadline: new Date(Date.now() + 5 * 86400_000).toISOString(), contractType: 'PONTUAL', contactChannel: 'x@y.com' })).body;
      if (review) await api().post(`/api/opportunities/admin/${o.id}/review`).set(bearer(admin.token)).send({ action: 'APROVAR' });
      if (past) await prisma.opportunity.update({ where: { id: o.id }, data: { deadline: new Date(Date.now() - 1000) } });
      return o.id;
    };
    const live = await mk('Vaga publicada', true, false);
    const draft = await mk('Vaga pendente', false, false);
    const expired = await mk('Vaga expirada', true, true);

    const r = await api().get('/sitemap.xml');
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /application\/xml/);
    assert.match(r.text, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    for (const loc of ['/', '/profissionais', '/oportunidades', '/planos', '/formalize-seu-negocio', `/profissionais/${ok}`, `/oportunidades/${live}`]) assert.ok(r.text.includes(`<loc>http://localhost:5173${loc}</loc>`), loc);
    for (const loc of [`/profissionais/${pending}`, `/oportunidades/${draft}`, `/oportunidades/${expired}`, '/painel']) assert.ok(!r.text.includes(loc), `não deve conter ${loc}`);
    assert.equal((await api().get('/api/sitemap.xml')).status, 200);
  });
});
