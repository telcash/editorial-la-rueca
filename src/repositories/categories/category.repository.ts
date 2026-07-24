import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, ne, or } from 'drizzle-orm';

import { db } from '@/db';
import { bookCategories, categories, type Category, type NewCategory } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import { createPaginatedResult, getOffset } from '@/features/admin/lib/list-query';
import type {
  CategoryAdminListItem,
  CategoryAdminListOptions,
} from '@/services/categories/category.types';

type CategoryCreateData = NewCategory;
type CategoryUpdateData = Partial<Omit<NewCategory, 'id' | 'createdAt' | 'updatedAt'>>;

function getArchiveCondition(status: ArchiveStatus = 'active') {
  if (status === 'all') {
    return undefined;
  }

  return eq(categories.isArchived, status === 'archived');
}

function getCategorySearchCondition(query: string | undefined) {
  const normalizedQuery = query?.trim();

  if (!normalizedQuery) {
    return undefined;
  }

  const pattern = `%${normalizedQuery}%`;

  return or(ilike(categories.name, pattern), ilike(categories.slug, pattern));
}

function getCategoryListCondition(status: ArchiveStatus, query: string | undefined) {
  const conditions = [getArchiveCondition(status), getCategorySearchCondition(query)].filter(
    (condition) => condition !== undefined,
  );

  return conditions.length > 0 ? and(...conditions) : undefined;
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

export async function findAllWithBookCountPaginated(
  status: ArchiveStatus = 'active',
  options: CategoryAdminListOptions,
): Promise<PaginatedResult<CategoryAdminListItem>> {
  const whereCondition = getCategoryListCondition(status, options.query);
  const [{ totalItems = 0 } = {}] = await db
    .select({ totalItems: count() })
    .from(categories)
    .where(whereCondition);
  const totalPages = Math.max(1, Math.ceil(totalItems / options.pageSize));
  const safePage = Math.min(Math.max(options.page, 1), totalPages);
  const rows = await db
    .select({
      category: categories,
      bookCount: count(bookCategories.bookId),
    })
    .from(categories)
    .leftJoin(bookCategories, eq(bookCategories.categoryId, categories.id))
    .where(whereCondition)
    .groupBy(categories.id)
    .orderBy(asc(categories.name))
    .limit(options.pageSize)
    .offset(getOffset(safePage, options.pageSize));

  return createPaginatedResult(rows, totalItems, safePage, options.pageSize);
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
