import 'server-only';

import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '@/db';
import { bookCategories, categories, type Category, type NewCategory } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { CategoryAdminListItem } from '@/services/categories/category.types';

type CategoryCreateData = NewCategory;
type CategoryUpdateData = Partial<Omit<NewCategory, 'id' | 'createdAt' | 'updatedAt'>>;

function getArchiveCondition(status: ArchiveStatus = 'active') {
  if (status === 'all') {
    return undefined;
  }

  return eq(categories.isArchived, status === 'archived');
}

export async function findById(id: string): Promise<Category | null> {
  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);

  return category ?? null;
}

export async function findBySlug(slug: string): Promise<Category | null> {
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

  return category ?? null;
}

export async function findByIds(ids: string[]): Promise<Category[]> {
  if (ids.length === 0) {
    return [];
  }

  return db.select().from(categories).where(inArray(categories.id, ids));
}

export async function findAll(status: ArchiveStatus = 'active'): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(getArchiveCondition(status))
    .orderBy(asc(categories.name));
}

export async function findAllWithBookCount(
  status: ArchiveStatus = 'active',
): Promise<CategoryAdminListItem[]> {
  return db
    .select({
      category: categories,
      bookCount: count(bookCategories.bookId),
    })
    .from(categories)
    .leftJoin(bookCategories, eq(bookCategories.categoryId, categories.id))
    .where(getArchiveCondition(status))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));
}

export async function findActive(): Promise<Category[]> {
  return findAll('active');
}

export async function findArchived(): Promise<Category[]> {
  return findAll('archived');
}

export async function findPublished(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.isPublished, true), eq(categories.isArchived, false)))
    .orderBy(desc(categories.createdAt), asc(categories.name));
}

export async function existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(categories.slug, slug), ne(categories.id, excludeId))
    : eq(categories.slug, slug);
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(conditions)
    .limit(1);

  return category !== undefined;
}

export async function create(data: CategoryCreateData): Promise<Category> {
  const [category] = await db.insert(categories).values(data).returning();

  if (!category) {
    throw new Error('Category creation did not return a record.');
  }

  return category;
}

export async function update(id: string, data: CategoryUpdateData): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

export async function archive(id: string): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

export async function restore(id: string): Promise<Category | null> {
  const [category] = await db
    .update(categories)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  return category ?? null;
}

export async function deleteById(id: string): Promise<Category | null> {
  const [category] = await db.delete(categories).where(eq(categories.id, id)).returning();

  return category ?? null;
}

export async function countBooksByCategoryId(categoryId: string): Promise<number> {
  const [result] = await db
    .select({
      bookCount: count(bookCategories.bookId),
    })
    .from(bookCategories)
    .where(eq(bookCategories.categoryId, categoryId));

  return result?.bookCount ?? 0;
}
