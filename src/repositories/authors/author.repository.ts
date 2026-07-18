import 'server-only';

import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '@/db';
import { authors, type Author, type NewAuthor } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';

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
