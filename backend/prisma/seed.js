import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIAS = [
  'Eletricista', 'Encanador', 'Pedreiro', 'Pintor', 'Diarista', 'Cabeleireiro(a)', 'Manicure',
  'Fotógrafo(a)', 'Designer', 'Marceneiro', 'Mecânico', 'Professor(a) particular', 'Técnico de informática',
];

const slugify = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const email = process.env.SEED_SUPERADMIN_EMAIL;
const password = process.env.SEED_SUPERADMIN_PASSWORD;
if (!email || !password) throw new Error('Defina SEED_SUPERADMIN_EMAIL e SEED_SUPERADMIN_PASSWORD');

await prisma.user.upsert({
  where: { email },
  update: {},
  create: { name: 'Superadministrador', email, role: 'SUPERADMIN', passwordHash: await bcrypt.hash(password, 12), consentAt: new Date() },
});

for (const name of CATEGORIAS) {
  await prisma.category.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name) } });
}

console.log(`Seed concluído: superadmin ${email} e ${CATEGORIAS.length} categorias.`);
await prisma.$disconnect();
