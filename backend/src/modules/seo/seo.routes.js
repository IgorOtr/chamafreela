import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const base = () => env.SITE_URL.replace(/\/+$/, '');

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(['User-agent: *', 'Allow: /', 'Disallow: /painel', 'Disallow: /entrar', 'Disallow: /api', '', `Sitemap: ${base()}/sitemap.xml`, ''].join('\n'));
});

// Somente conteúdo PÚBLICO e vigente: perfis aprovados e oportunidades publicadas, dentro do prazo, de empresas ativas.
router.get('/sitemap.xml', asyncHandler(async (_req, res) => {
  const [pros, opps] = await Promise.all([
    prisma.professional.findMany({ where: { status: 'APROVADO' }, select: { slug: true, updatedAt: true }, take: 20000 }),
    prisma.opportunity.findMany({ where: { status: 'PUBLICADA', deadline: { gte: new Date() }, company: { status: 'ATIVA' } }, select: { id: true, updatedAt: true }, take: 20000 }),
  ]);
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' }, { loc: '/profissionais', priority: '0.9', changefreq: 'daily' },
    { loc: '/oportunidades', priority: '0.9', changefreq: 'daily' }, { loc: '/planos', priority: '0.7', changefreq: 'monthly' }, { loc: '/formalize-seu-negocio', priority: '0.7', changefreq: 'monthly' }, { loc: '/privacidade', priority: '0.3', changefreq: 'yearly' },
    ...pros.map((p) => ({ loc: `/profissionais/${p.slug}`, lastmod: p.updatedAt, priority: '0.6', changefreq: 'weekly' })),
    ...opps.map((o) => ({ loc: `/oportunidades/${o.id}`, lastmod: o.updatedAt, priority: '0.6', changefreq: 'daily' })),
  ];
  const body = urls.map((u) => `  <url><loc>${xml(base() + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}));

export default router;
