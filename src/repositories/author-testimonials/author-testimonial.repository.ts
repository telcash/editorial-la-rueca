import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { authors, authorTestimonials, books, type AuthorTestimonial } from '@/db/schema';
import type {
  AuthorTestimonialAdminListItem,
  AuthorTestimonialBookSummary,
  AuthorTestimonialPublicItem,
} from '@/services/author-testimonials/author-testimonial.types';
import type {
  CreateAuthorTestimonialInput,
  UpdateAuthorTestimonialInput,
} from '@/schemas/author-testimonials/author-testimonial.schema';

type AuthorTestimonialCreateData = CreateAuthorTestimonialInput;
type AuthorTestimonialUpdateData = UpdateAuthorTestimonialInput;

function mapBook(row: {
  bookId: string | null;
  bookTitle: string | null;
  bookSlug: string | null;
}): AuthorTestimonialBookSummary | null {
  if (!row.bookId || !row.bookTitle || !row.bookSlug) {
    return null;
  }

  return {
    id: row.bookId,
    title: row.bookTitle,
    slug: row.bookSlug,
  };
}

function getBaseSelect() {
  return {
    testimonial: authorTestimonials,
    author: {
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      photoUrl: authors.photoUrl,
    },
    bookId: books.id,
    bookTitle: books.title,
    bookSlug: books.slug,
  };
}

async function getAdminListRows(whereCondition?: ReturnType<typeof eq>) {
  const rows = await db
    .select(getBaseSelect())
    .from(authorTestimonials)
    .innerJoin(authors, eq(authors.id, authorTestimonials.authorId))
    .leftJoin(books, eq(books.id, authorTestimonials.bookId))
    .where(whereCondition)
    .orderBy(
      asc(authorTestimonials.sortOrder),
      asc(authorTestimonials.createdAt),
      asc(authorTestimonials.id),
    );

  return rows.map((row): AuthorTestimonialAdminListItem => ({
    testimonial: row.testimonial,
    author: row.author,
    book: mapBook(row),
  }));
}

function toPublicItem(item: AuthorTestimonialAdminListItem): AuthorTestimonialPublicItem {
  return {
    id: item.testimonial.id,
    quote: item.testimonial.quote,
    author: item.author,
    book: item.book,
  };
}

export async function findById(id: string): Promise<AuthorTestimonial | null> {
  const [testimonial] = await db
    .select()
    .from(authorTestimonials)
    .where(eq(authorTestimonials.id, id))
    .limit(1);

  return testimonial ?? null;
}

export async function findAll(): Promise<AuthorTestimonialAdminListItem[]> {
  return getAdminListRows();
}

export async function findPublished(): Promise<AuthorTestimonialPublicItem[]> {
  const items = await getAdminListRows(eq(authorTestimonials.isPublished, true));

  return items.map(toPublicItem);
}

export async function findFeaturedPublished(): Promise<AuthorTestimonialPublicItem[]> {
  const items = await getAdminListRows(
    and(eq(authorTestimonials.isPublished, true), eq(authorTestimonials.isFeatured, true)),
  );

  return items.map(toPublicItem);
}

export async function findByAuthorId(authorId: string): Promise<AuthorTestimonialAdminListItem[]> {
  return getAdminListRows(eq(authorTestimonials.authorId, authorId));
}

export async function create(data: AuthorTestimonialCreateData): Promise<AuthorTestimonial> {
  const [testimonial] = await db.insert(authorTestimonials).values(data).returning();

  if (!testimonial) {
    throw new Error('Author testimonial creation did not return a record.');
  }

  return testimonial;
}

export async function update(
  id: string,
  data: AuthorTestimonialUpdateData,
): Promise<AuthorTestimonial | null> {
  const [testimonial] = await db
    .update(authorTestimonials)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(authorTestimonials.id, id))
    .returning();

  return testimonial ?? null;
}

export async function deleteById(id: string): Promise<AuthorTestimonial | null> {
  const [testimonial] = await db
    .delete(authorTestimonials)
    .where(eq(authorTestimonials.id, id))
    .returning();

  return testimonial ?? null;
}
