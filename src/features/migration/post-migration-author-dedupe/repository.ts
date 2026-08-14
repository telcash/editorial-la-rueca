import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { authors, bookAuthors, books } from '@/db/schema';
import type { AuthorDedupeBookRelation, AuthorDedupeSourceAuthor } from './types';

export async function readAuthorDedupeSourceAuthors(): Promise<AuthorDedupeSourceAuthor[]> {
  const authorRows = await db
    .select()
    .from(authors)
    .orderBy(asc(authors.name), asc(authors.slug), asc(authors.id));
  const relationsByAuthorId = await readRelationsByAuthorId(authorRows.map((author) => author.id));

  return authorRows.map((author) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    shortBio: author.shortBio,
    biography: author.biography,
    photoUrl: author.photoUrl,
    websiteUrl: author.websiteUrl,
    instagramUrl: author.instagramUrl,
    facebookUrl: author.facebookUrl,
    country: author.country,
    isPublished: author.isPublished,
    isFeatured: author.isFeatured,
    isArchived: author.isArchived,
    sortOrder: author.sortOrder,
    createdAt: author.createdAt.toISOString(),
    updatedAt: author.updatedAt.toISOString(),
    books: relationsByAuthorId.get(author.id) ?? [],
  }));
}

async function readRelationsByAuthorId(authorIds: string[]) {
  const relationsByAuthorId = new Map<string, AuthorDedupeBookRelation[]>();

  if (authorIds.length === 0) {
    return relationsByAuthorId;
  }

  const rows = await db
    .select({
      authorId: bookAuthors.authorId,
      bookId: books.id,
      title: books.title,
      slug: books.slug,
      isPublished: books.isPublished,
      isArchived: books.isArchived,
    })
    .from(bookAuthors)
    .innerJoin(books, eq(books.id, bookAuthors.bookId))
    .where(inArray(bookAuthors.authorId, authorIds))
    .orderBy(asc(bookAuthors.authorId), asc(bookAuthors.sortOrder), asc(books.title));

  for (const row of rows) {
    const currentRelations = relationsByAuthorId.get(row.authorId) ?? [];
    currentRelations.push({
      bookId: row.bookId,
      title: row.title,
      slug: row.slug,
      isPublished: row.isPublished,
      isArchived: row.isArchived,
    });
    relationsByAuthorId.set(row.authorId, currentRelations);
  }

  return relationsByAuthorId;
}
