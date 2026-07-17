import 'server-only';

import { and, asc, desc, eq, ne } from 'drizzle-orm';

import { db } from '@/db';
import { authors, type Author, type NewAuthor } from '@/db/schema';

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

export async function findAll(): Promise<Author[]> {
  return db.select().from(authors).orderBy(asc(authors.sortOrder), asc(authors.name));
}

export async function findPublished(): Promise<Author[]> {
  return db
    .select()
    .from(authors)
    .where(eq(authors.isPublished, true))
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
