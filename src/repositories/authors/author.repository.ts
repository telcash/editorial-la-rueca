import 'server-only';

import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import { authors, bookAuthors, type Author, type NewAuthor } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type {
  AuthorAdminListItem,
  AuthorDashboardCounts,
  AuthorRecentItem,
} from '@/services/authors/author-service.types';

type AuthorCreateData = NewAuthor;
type AuthorUpdateData = Partial<Omit<NewAuthor, 'id' | 'createdAt' | 'updatedAt'>>;

export async function findById(id: string): Promise<Author | null> {
  const [author] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);

  return author ?? null;
}

export async function findBySlug(slug: string): Promise<Author | null> {
  const [author] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);

  return author ?? null;
}

export async function findByIds(ids: string[]): Promise<Author[]> {
  if (ids.length === 0) {
    return [];
  }

  return db.select().from(authors).where(inArray(authors.id, ids));
}

function getArchiveCondition(status: ArchiveStatus = 'active') {
  if (status === 'all') {
    return undefined;
  }

  return eq(authors.isArchived, status === 'archived');
}

export async function findAll(status: ArchiveStatus = 'active'): Promise<Author[]> {
  return db
    .select()
    .from(authors)
    .where(getArchiveCondition(status))
    .orderBy(asc(authors.sortOrder), asc(authors.name));
}

export async function findAllWithBookCount(
  status: ArchiveStatus = 'active',
): Promise<AuthorAdminListItem[]> {
  const rows = await db
    .select({
      author: authors,
      bookCount: count(bookAuthors.bookId),
    })
    .from(authors)
    .leftJoin(bookAuthors, eq(bookAuthors.authorId, authors.id))
    .where(getArchiveCondition(status))
    .groupBy(authors.id)
    .orderBy(asc(authors.sortOrder), asc(authors.name));

  return rows;
}

export async function getDashboardCounts(): Promise<AuthorDashboardCounts> {
  const [result] = await db
    .select({
      active: sql<number>`count(*) filter (where ${authors.isArchived} = false)`.mapWith(Number),
      archived: sql<number>`count(*) filter (where ${authors.isArchived} = true)`.mapWith(Number),
    })
    .from(authors);

  return {
    active: result?.active ?? 0,
    archived: result?.archived ?? 0,
  };
}

export async function findRecent(limit = 5): Promise<AuthorRecentItem[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);

  return db
    .select({
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      photoUrl: authors.photoUrl,
      isPublished: authors.isPublished,
      createdAt: authors.createdAt,
    })
    .from(authors)
    .where(eq(authors.isArchived, false))
    .orderBy(desc(authors.createdAt))
    .limit(safeLimit);
}

export async function findActive(): Promise<Author[]> {
  return findAll('active');
}

export async function findArchived(): Promise<Author[]> {
  return findAll('archived');
}

export async function findPublished(): Promise<Author[]> {
  return db
    .select()
    .from(authors)
    .where(and(eq(authors.isPublished, true), eq(authors.isArchived, false)))
    .orderBy(desc(authors.isFeatured), asc(authors.sortOrder), asc(authors.name));
}

export async function countBooksByAuthorId(authorId: string): Promise<number> {
  const [result] = await db
    .select({
      bookCount: count(bookAuthors.bookId),
    })
    .from(bookAuthors)
    .where(eq(bookAuthors.authorId, authorId));

  return result?.bookCount ?? 0;
}

export async function existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(authors.slug, slug), ne(authors.id, excludeId))
    : eq(authors.slug, slug);

  const [author] = await db.select({ id: authors.id }).from(authors).where(conditions).limit(1);

  return author !== undefined;
}

export async function create(data: AuthorCreateData): Promise<Author> {
  const [author] = await db.insert(authors).values(data).returning();

  if (!author) {
    throw new Error('Author creation did not return a record.');
  }

  return author;
}

export async function update(id: string, data: AuthorUpdateData): Promise<Author | null> {
  const [author] = await db
    .update(authors)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(authors.id, id))
    .returning();

  return author ?? null;
}

export async function archive(id: string): Promise<Author | null> {
  const [author] = await db
    .update(authors)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(authors.id, id))
    .returning();

  return author ?? null;
}

export async function restore(id: string): Promise<Author | null> {
  const [author] = await db
    .update(authors)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(authors.id, id))
    .returning();

  return author ?? null;
}

export async function deleteById(id: string): Promise<Author | null> {
  const [author] = await db.delete(authors).where(eq(authors.id, id)).returning();

  return author ?? null;
}
