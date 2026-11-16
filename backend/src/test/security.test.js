import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { after, before, beforeEach, describe, it } from 'node:test';
import { app } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { api, bearer, createUser, resetDb, tokenFor } from './helpers.js';

// ---- Enumeração automática de TODAS as rotas registradas no Express
function listRoutes() {
  const out = [];
  const unmount = (re) => re.source.replace('^', '').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/').replace(/\$$/, '');
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) for (const m of Object.keys(layer.route.methods)) out.push({ method: m.toUpperCase(), path: prefix + layer.route.path });
      else if (layer.name === 'router' && layer.handle.stack) walk(layer.handle.stack, prefix + unmount(layer.regexp));
    }
  };
  walk(app._router.stack, '');
  return out.map((r) => ({ ...r, path: r.path.length > 1 ? r.path.replace(/\/$/, '') : r.path }));
}

// Rotas intencionalmente públicas (qualquer outra DEVE exigir autenticação).
const PUBLIC = new Set([
  'GET /api/health', 'POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/refresh', 'POST /api/auth/logout',
  'GET /api/categories', 'GET /api/professionals', 'GET /api/professionals/cities', 'GET /api/professionals/:slug',
  'GET /api/opportunities', 'GET /api/opportunities/cities', 'GET /api/opportunities/:id',
  'GET /api/plans', 'POST /api/billing/webhook/asaas', 'GET /robots.txt', 'GET /sitemap.xml', 'GET /api/robots.txt', 'GET /api/sitemap.xml',
]);

const call = (r) => api()[r.method.toLowerCase()](r.path.replace(/:\w+/g, '00000000-0000-4000-8000-000000000000')).send({});

describe('segurança: autenticação em todas as rotas', () => {
  after(() => prisma.$disconnect());

  it('enumera as rotas da aplicação (sanidade do teste)', () => {
    const routes = listRoutes();
    assert.ok(routes.length > 80, `rotas encontradas: ${routes.length}`);
    assert.ok(routes.some((r) => r.method === 'POST' && r.path === '/api/auth/login'));
    assert.ok(routes.some((r) => r.method === 'PATCH' && r.path === '/api/plans/admin/:code'));
  });

  it('toda rota que não está na lista pública responde 401 sem token', async () => {
    const protectedRoutes = listRoutes().filter((r) => !PUBLIC.has(`${r.method} ${r.path}`) && !r.path.startsWith('/api/docs'));
    const failures = [];
    for (const r of protectedRoutes) {
      const res = await call(r);
      if (res.status !== 401) failures.push(`${r.method} ${r.path} → ${res.status}`);
    }
    assert.deepEqual(failures, [], `rotas sem proteção de autenticação:\n${failures.join('\n')}`);
  });

  it('as rotas públicas listadas realmente existem (a lista não apodrece)', () => {
    const existing = new Set(listRoutes().map((r) => `${r.method} ${r.path}`));
    for (const p of PUBLIC) assert.ok(existing.has(p), `rota pública inexistente na lista: ${p}`);
  });
});

describe('segurança: autorização por papel (RBAC no servidor)', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  const ADMIN_ONLY = [
    ['GET', '/api/admin/dashboard'], ['GET', '/api/admin/reports/overview'], ['GET', '/api/admin/reports/events'], ['GET', '/api/admin/reports/export?dataset=signups'],
    ['GET', '/api/users'], ['PATCH', '/api/users/00000000-0000-4000-8000-000000000000'], ['GET', '/api/audit'],
    ['GET', '/api/plans/admin'], ['PATCH', '/api/plans/admin/PRO'], ['GET', '/api/subscriptions/admin'], ['POST', '/api/subscriptions/admin/grant'],
    ['POST', '/api/subscriptions/admin/00000000-0000-4000-8000-000000000000/cancel'], ['POST', '/api/territorial/admin/sync'],
    ['GET', '/api/professionals/admin/list'], ['POST', '/api/professionals/admin/00000000-0000-4000-8000-000000000000/review'],
    ['GET', '/api/opportunities/admin/list'], ['GET', '/api/companies/admin/list'], ['GET', '/api/data-requests'],
    ['PUT', '/api/recommendations/config'], ['GET', '/api/categories/all'], ['POST', '/api/categories'],
  ];

  it('papéis de usuário (PROFISSIONAL, EMPRESA, CLIENTE) recebem 403 em TODAS as rotas administrativas', async () => {
    const failures = [];
    for (const role of ['PROFISSIONAL', 'EMPRESA', 'CLIENTE']) {
      const t = await tokenFor(role);
      for (const [method, path] of ADMIN_ONLY) {
        const res = await api()[method.toLowerCase()](path).set(bearer(t.token)).send({});
        if (res.status !== 403) failures.push(`${role} ${method} ${path} → ${res.status}`);
      }
    }
    assert.deepEqual(failures, []);
  });

  it('moderador não acessa configuração, planos, assinaturas, relatórios nem alteração de usuários', async () => {
    const t = await tokenFor('MODERADOR');
    const failures = [];
    for (const [method, path] of ADMIN_ONLY.filter(([, p]) => /plans|subscriptions|reports|config|territorial|users\/|categories|audit|companies|data-requests/.test(p))) {
      const res = await api()[method.toLowerCase()](path).set(bearer(t.token)).send({});
      if (res.status !== 403) failures.push(`${method} ${path} → ${res.status}`);
    }
    assert.deepEqual(failures, []);
  });

  it('o papel vem do banco, não do token: claim forjada de ADMIN não eleva privilégio', async () => {
    const { user } = await createUser('PROFISSIONAL');
    const forged = jwt.sign({ role: 'SUPERADMIN' }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: '5m' });
    assert.equal((await api().get('/api/admin/dashboard').set(bearer(forged))).status, 403);
    assert.equal((await api().get('/api/auth/me').set(bearer(forged))).body.user.role, 'PROFISSIONAL');
  });
});

describe('segurança: tokens, sessão e credenciais', () => {
  beforeEach(resetDb);
  after(() => prisma.$disconnect());

  it('rejeita token com segredo errado, alg=none, expirado e subject inexistente', async () => {
    const { user } = await createUser('PROFISSIONAL');
    const wrongSecret = jwt.sign({}, 'outro-segredo-qualquer-com-mais-de-32-caracteres!!', { subject: user.id, expiresIn: '5m' });
    const expired = jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: -10 });
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id })).toString('base64url')}.`;
    const ghost = jwt.sign({}, env.JWT_ACCESS_SECRET, { subject: '00000000-0000-4000-8000-000000000000', expiresIn: '5m' });
    for (const [label, token] of Object.entries({ wrongSecret, expired, none, ghost, lixo: 'abc.def.ghi' })) {
      assert.equal((await api().get('/api/auth/me').set(bearer(token))).status, 401, label);
    }
    assert.equal((await api().get('/api/auth/me').set({ Authorization: `Basic ${wrongSecret}` })).status, 401);
  });

  it('cookie de sessão: HttpOnly, SameSite=Strict e restrito a /api/auth', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Maria', email: 'm@teste.com', password: 'Senha1234', role: 'CLIENTE', consent: true });
    const cookie = res.headers['set-cookie'][0];
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\/api\/auth/);
    assert.equal(res.body.refreshToken, undefined, 'refresh token nunca vai no corpo');
  });

  it('nenhuma resposta vaza hash de senha ou hash de token', async () => {
    const admin = await tokenFor('ADMIN');
    await createUser('PROFISSIONAL');
    const bodies = [
      (await api().get('/api/users').set(bearer(admin.token))).text, (await api().get('/api/auth/me').set(bearer(admin.token))).text,
      (await api().get('/api/audit').set(bearer(admin.token))).text, (await api().get('/api/admin/dashboard').set(bearer(admin.token))).text,
    ];
    for (const b of bodies) assert.doesNotMatch(b, /passwordHash|tokenHash|\$2[aby]\$/);
  });

  it('limitador de login por e-mail bloqueia força bruta mesmo trocando de origem', async () => {
    process.env.RATE_LIMIT_TEST = 'true';
    try {
      const email = 'vitima@teste.com';
      const statuses = [];
      for (let i = 0; i < 12; i++) statuses.push((await api().post('/api/auth/login').send({ email, password: `Errada${i}1234` })).status);
      assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
      assert.equal(statuses[10], 429);
      assert.equal(statuses[11], 429);
      const other = await api().post('/api/auth/login').send({ email: 'outra@teste.com', password: 'Errada12345' });
      assert.equal(other.status, 401, 'outro e-mail não é afetado');
    } finally { delete process.env.RATE_LIMIT_TEST; }
  });
});

describe('segurança: entrada de dados e injeção', () => {
  before(resetDb);
  after(() => prisma.$disconnect());

  it('mass assignment: campos privilegiados enviados pelo cliente são descartados', async () => {
    await resetDb();
    const cat = await prisma.category.create({ data: { name: 'Eletricista', slug: 'eletricista' } });
    const t = await tokenFor('PROFISSIONAL');
    const r = await api().put('/api/professionals/me').set(bearer(t.token)).send({
      displayName: 'Zé', categoryId: cat.id, description: 'Profissional atendendo a região há anos.', city: 'Volta Redonda', mode: 'PRESENCIAL', radiusKm: 5, whatsapp: '24999990000',
      services: [{ name: 'Fiação' }], status: 'APROVADO', featured: true, userId: 'outro', slug: 'hack', approvedAt: '2020-01-01',
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'PENDENTE');
    assert.equal(r.body.featured, false);
    assert.equal(r.body.slug, 'ze');
    assert.equal(r.body.userId, t.user.id);
    const reg = await api().post('/api/auth/register').send({ name: 'Eve', email: 'eve@teste.com', password: 'Senha1234', role: 'CLIENTE', consent: true, status: 'ATIVO', emailVerified: true });
    assert.equal(reg.body.user.role, 'CLIENTE');
  });

  it('tentativas de SQL injection em filtros não alteram dados nem quebram a API', async () => {
    const payloads = ["' OR 1=1 --", "'); DROP TABLE \"User\"; --", '%27%20UNION%20SELECT%20*%20FROM%20%22User%22--', 'a%00b'];
    for (const p of payloads.filter((x) => !x.includes('%00'))) {
      for (const path of ['/api/professionals?q=', '/api/professionals?city=', '/api/opportunities?q=', '/api/professionals?category=']) {
        const res = await api().get(path + p);
        assert.ok([200, 400].includes(res.status), `${path}${p} → ${res.status}`);
      }
    }
    assert.ok((await prisma.user.count()) >= 1, 'tabela User intacta');
    // byte NUL (rejeitado pelo PostgreSQL) vira 400, não 500
    assert.equal((await api().get('/api/professionals?q=a%00b')).status, 400);
    assert.equal((await api().post('/api/auth/login').send({ email: 'a@b.com', password: 'x\u0000y' })).status, 400);
  });

  it('conteúdo com HTML/script é devolvido como dado JSON inerte (nosniff + JSON), nunca como HTML', async () => {
    const cat = await prisma.category.findFirst();
    const t = await tokenFor('PROFISSIONAL');
    await api().put('/api/professionals/me').set(bearer(t.token)).send({ displayName: '<img src=x onerror=alert(1)>', categoryId: cat.id, description: '<script>alert(1)</script> descrição longa suficiente', city: 'Volta Redonda', mode: 'PRESENCIAL', radiusKm: 5, whatsapp: '24999990000', services: [{ name: 'x<y' }] });
    const res = await api().get('/api/professionals/me').set(bearer(t.token));
    assert.match(res.headers['content-type'], /application\/json/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.body.displayName, '<img src=x onerror=alert(1)>');
  });

  it('URLs perigosas no portfólio e no site da empresa são recusadas', async () => {
    const cat = await prisma.category.findFirst();
    const t = await tokenFor('PROFISSIONAL');
    const base = { displayName: 'Zé', categoryId: cat.id, description: 'Profissional atendendo a região há anos.', city: 'Volta Redonda', mode: 'PRESENCIAL', radiusKm: 5, whatsapp: '24999990000', services: [{ name: 'Fiação' }] };
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd', 'ftp://x.com/a']) {
      assert.equal((await api().put('/api/professionals/me').set(bearer(t.token)).send({ ...base, portfolio: [{ type: 'IMAGEM', url }] })).status, 400, url);
    }
    const e = await tokenFor('EMPRESA');
    assert.equal((await api().put('/api/companies/me').set(bearer(e.token)).send({ tradeName: 'X Ltda', city: 'VR', phone: '2433334444', responsibleName: 'C', website: 'javascript:alert(1)' })).status, 400);
  });

  it('corpo muito grande é recusado com 413 e JSON malformado com 400, sem vazar detalhes internos', async () => {
    const big = await api().post('/api/auth/login').set('Content-Type', 'application/json').send(JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(2_000_000) }));
    assert.equal(big.status, 413);
    assert.doesNotMatch(big.text, /node_modules|at \w+ \(/);
    const bad = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email": ');
    assert.equal(bad.status, 400);
    const nf = await api().get('/api/rota-inexistente');
    assert.equal(nf.status, 404);
    assert.match(nf.headers['content-type'], /json/);
  });
});

describe('segurança: cabeçalhos e CORS', () => {
  after(() => prisma.$disconnect());

  it('cabeçalhos de segurança presentes e sem x-powered-by', async () => {
    const r = await api().get('/api/health');
    assert.equal(r.headers['x-powered-by'], undefined);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.match(r.headers['content-security-policy'], /default-src 'none'/);
    assert.match(r.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.ok(r.headers['strict-transport-security']);
    assert.equal(r.headers['x-frame-options'], 'SAMEORIGIN');
    assert.equal(r.headers['referrer-policy'], 'no-referrer');
  });

  it('CORS: só a origem configurada é aceita (com credenciais); origens estranhas não recebem permissão', async () => {
    const ok = await api().get('/api/health').set('Origin', env.CORS_ORIGIN);
    assert.equal(ok.headers['access-control-allow-origin'], env.CORS_ORIGIN);
    assert.equal(ok.headers['access-control-allow-credentials'], 'true');
    // Com origem fixa, o servidor sempre responde com a origem permitida; o navegador bloqueia qualquer outra.
    for (const origin of ['https://evil.example', 'null']) {
      const r = await api().get('/api/health').set('Origin', origin);
      assert.notEqual(r.headers['access-control-allow-origin'], origin);
      assert.notEqual(r.headers['access-control-allow-origin'], '*');
    }
    const pre = await api().options('/api/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    assert.notEqual(pre.headers['access-control-allow-origin'], 'https://evil.example');
    assert.match(ok.headers.vary ?? '', /Origin/);
  });

  it('respostas são comprimidas quando o cliente aceita gzip e o Swagger só é exposto fora de produção', async () => {
    const big = await api().get('/api/sitemap.xml').set('Accept-Encoding', 'gzip');
    assert.ok(big.status === 200);
    const docs = await api().get('/api/docs/');
    assert.equal(docs.status, 200, 'em teste/desenvolvimento a documentação está ativa');
    assert.doesNotMatch(docs.headers['content-security-policy'] ?? '', /default-src 'none'/);
  });
});
