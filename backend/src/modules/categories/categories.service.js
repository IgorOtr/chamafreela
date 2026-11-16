import { prisma } from '../../database/prisma.js';
import { conflict, notFound } from '../../utils/errors.js';
import { slugify } from '../../utils/slugify.js';
import * as audit from '../audit/audit.service.js';

export const listPublic = () => prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
export const listAll = () => prisma.category.findMany({ orderBy: { name: 'asc' } });

export async function create(actor, { name, description }, ip) {
  const slug = slugify(name);
  if (await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } })) throw conflict('Categoria já existe');
  const category = await prisma.category.create({ data: { name, slug, description } });
  await audit.record({ actorId: actor.id, action: 'CATEGORY_CREATE', entity: 'Category', entityId: category.id, changes: { name }, ip });
  return category;
}

export async function update(actor, id, data, ip) {
  const current = await prisma.category.findUnique({ where: { id } });
  if (!current) throw notFound('Categoria não encontrada');
  const patch = { ...data };
  if (data.name && data.name !== current.name) {
    patch.slug = slugify(data.name);
    if (await prisma.category.findFirst({ where: { id: { not: id }, OR: [{ name: data.name }, { slug: patch.slug }] } }))
      throw conflict('Categoria já existe');
  }
  const category = await prisma.category.update({ where: { id }, data: patch });
  await audit.record({ actorId: actor.id, action: 'CATEGORY_UPDATE', entity: 'Category', entityId: id, changes: data, ip });
  return category;
}
