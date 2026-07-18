import 'server-only';

import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';

import { db } from '@/db';
import {
  authors,
  bookAuthors,
  bookEditions,
  books,
  type Book,
  type NewBookEdition,
} from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { BookEditionInput } from '@/schemas/books/book.schema';
import type {
  BookAuthorSummary,
  BookDataCreateInput,
  BookDataUpdateInput,
  BookEditionDetails,
  BookWithDetails,
} from '@/services/books/book.types';

type BookRow = Book;

interface AuthorSummaryRow extends BookAuthorSummary {
  bookId: string;
}

interface EditionRow extends BookEditionDetails {
  bookId: string;
}

function mapBookAuthors(authorRows: AuthorSummaryRow[]): Map<string, BookAuthorSummary[]> {
  const authorsByBookId = new Map<string, BookAuthorSummary[]>();

  for (const { bookId, ...author } of authorRows) {
    const currentAuthors = authorsByBookId.get(bookId) ?? [];
    currentAuthors.push(author);
    authorsByBookId.set(bookId, currentAuthors);
  }

  return authorsByBookId;
}

function mapBookEditions(editionRows: EditionRow[]): Map<string, BookEditionDetails[]> {
  const editionsByBookId = new Map<string, BookEditionDetails[]>();

  for (const edition of editionRows) {
    const currentEditions = editionsByBookId.get(edition.bookId) ?? [];
    currentEditions.push(edition);
    editionsByBookId.set(edition.bookId, currentEditions);
  }

  return editionsByBookId;
}

function assembleBooks(
  bookRows: BookRow[],
  authorRows: AuthorSummaryRow[],
  editionRows: EditionRow[],
): BookWithDetails[] {
  const authorsByBookId = mapBookAuthors(authorRows);
  const editionsByBookId = mapBookEditions(editionRows);

  return bookRows.map((book) => ({
    ...book,
    authors: authorsByBookId.get(book.id) ?? [],
    editions: editionsByBookId.get(book.id) ?? [],
  }));
}

function toEditionInsert(bookId: string, edition: BookEditionInput): NewBookEdition {
  return {
    bookId,
    format: edition.format,
    editionLabel: edition.editionLabel,
    publicationDate: edition.publicationDate,
    isbn10: edition.isbn10,
    isbn13: edition.isbn13,
    price: edition.price,
    currency: edition.currency,
    pages: edition.pages,
    isAvailable: edition.isAvailable,
    isFeatured: edition.isFeatured,
    sortOrder: edition.sortOrder,
  };
}

function getArchiveCondition(status: ArchiveStatus = 'active') {
  if (status === 'all') {
    return undefined;
  }

  return eq(books.isArchived, status === 'archived');
}

async function findDetailsByBookIds(bookIds: string[], onlyAvailableEditions = false) {
  if (bookIds.length === 0) {
    return {
      authorRows: [],
      editionRows: [],
    };
  }

  const authorRows = await db
    .select({
      bookId: bookAuthors.bookId,
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      photoUrl: authors.photoUrl,
      isArchived: authors.isArchived,
      sortOrder: bookAuthors.sortOrder,
    })
    .from(bookAuthors)
    .innerJoin(authors, eq(authors.id, bookAuthors.authorId))
    .where(inArray(bookAuthors.bookId, bookIds))
    .orderBy(asc(bookAuthors.bookId), asc(bookAuthors.sortOrder), asc(authors.name));

  const editionConditions = onlyAvailableEditions
    ? and(inArray(bookEditions.bookId, bookIds), eq(bookEditions.isAvailable, true))
    : inArray(bookEditions.bookId, bookIds);

  const editionRows = await db
    .select()
    .from(bookEditions)
    .where(editionConditions)
    .orderBy(asc(bookEditions.bookId), asc(bookEditions.sortOrder), asc(bookEditions.createdAt));

  return { authorRows, editionRows };
}

async function findOneByBook(book: BookRow | null, onlyAvailableEditions = false) {
  if (!book) {
    return null;
  }

  const { authorRows, editionRows } = await findDetailsByBookIds([book.id], onlyAvailableEditions);
  const [bookWithDetails] = assembleBooks([book], authorRows, editionRows);

  return bookWithDetails ?? null;
}

export async function findById(id: string): Promise<BookWithDetails | null> {
  const [book] = await db.select().from(books).where(eq(books.id, id)).limit(1);

  return findOneByBook(book ?? null);
}

export async function findBySlug(slug: string): Promise<BookWithDetails | null> {
  const [book] = await db.select().from(books).where(eq(books.slug, slug)).limit(1);

  return findOneByBook(book ?? null);
}

export async function findAll(status: ArchiveStatus = 'active'): Promise<BookWithDetails[]> {
  const bookRows = await db
    .select()
    .from(books)
    .where(getArchiveCondition(status))
    .orderBy(asc(books.sortOrder), desc(books.createdAt));
  const { authorRows, editionRows } = await findDetailsByBookIds(bookRows.map((book) => book.id));

  return assembleBooks(bookRows, authorRows, editionRows);
}

export async function findActive(): Promise<BookWithDetails[]> {
  return findAll('active');
}

export async function findArchived(): Promise<BookWithDetails[]> {
  return findAll('archived');
}

export async function findPublished(): Promise<BookWithDetails[]> {
  const bookRows = await db
    .select()
    .from(books)
    .where(and(eq(books.isPublished, true), eq(books.isArchived, false)))
    .orderBy(desc(books.isFeatured), asc(books.sortOrder), desc(books.createdAt));
  const { authorRows, editionRows } = await findDetailsByBookIds(
    bookRows.map((book) => book.id),
    true,
  );

  return assembleBooks(bookRows, authorRows, editionRows);
}

export async function existsBySlug(slug: string, excludeId?: string): Promise<boolean> {
  const conditions = excludeId
    ? and(eq(books.slug, slug), ne(books.id, excludeId))
    : eq(books.slug, slug);
  const [book] = await db.select({ id: books.id }).from(books).where(conditions).limit(1);

  return book !== undefined;
}

export async function existsByIsbn10(
  isbn10: string,
  excludeBookId?: string,
  excludeEditionId?: string,
): Promise<boolean> {
  const conditions = [
    eq(bookEditions.isbn10, isbn10),
    excludeBookId ? ne(bookEditions.bookId, excludeBookId) : undefined,
    excludeEditionId ? ne(bookEditions.id, excludeEditionId) : undefined,
  ].filter((condition) => condition !== undefined);

  const [edition] = await db
    .select({ id: bookEditions.id })
    .from(bookEditions)
    .where(and(...conditions))
    .limit(1);

  return edition !== undefined;
}

export async function existsByIsbn13(
  isbn13: string,
  excludeBookId?: string,
  excludeEditionId?: string,
): Promise<boolean> {
  const conditions = [
    eq(bookEditions.isbn13, isbn13),
    excludeBookId ? ne(bookEditions.bookId, excludeBookId) : undefined,
    excludeEditionId ? ne(bookEditions.id, excludeEditionId) : undefined,
  ].filter((condition) => condition !== undefined);

  const [edition] = await db
    .select({ id: bookEditions.id })
    .from(bookEditions)
    .where(and(...conditions))
    .limit(1);

  return edition !== undefined;
}

export async function create(
  bookData: BookDataCreateInput,
  authorIds: string[],
  editions: BookEditionInput[],
): Promise<BookWithDetails> {
  const createdBook = await db.transaction(async (tx) => {
    const [book] = await tx.insert(books).values(bookData).returning();

    if (!book) {
      throw new Error('Book creation did not return a record.');
    }

    await tx.insert(bookAuthors).values(
      authorIds.map((authorId, index) => ({
        bookId: book.id,
        authorId,
        sortOrder: index,
      })),
    );

    await tx
      .insert(bookEditions)
      .values(editions.map((edition) => toEditionInsert(book.id, edition)));

    return book;
  });

  const bookWithDetails = await findById(createdBook.id);

  if (!bookWithDetails) {
    throw new Error('Book creation did not return details.');
  }

  return bookWithDetails;
}

export async function update(
  id: string,
  bookData: BookDataUpdateInput,
  authorIds?: string[],
  editions?: BookEditionInput[],
): Promise<BookWithDetails | null> {
  const updatedBookId = await db.transaction(async (tx) => {
    const [book] = await tx
      .update(books)
      .set({
        ...bookData,
        updatedAt: new Date(),
      })
      .where(eq(books.id, id))
      .returning({ id: books.id });

    if (!book) {
      return null;
    }

    if (authorIds) {
      await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, id));
      await tx.insert(bookAuthors).values(
        authorIds.map((authorId, index) => ({
          bookId: id,
          authorId,
          sortOrder: index,
        })),
      );
    }

    if (editions) {
      await tx.delete(bookEditions).where(eq(bookEditions.bookId, id));
      await tx.insert(bookEditions).values(editions.map((edition) => toEditionInsert(id, edition)));
    }

    return book.id;
  });

  return updatedBookId ? findById(updatedBookId) : null;
}

export async function archive(id: string): Promise<BookWithDetails | null> {
  const [book] = await db
    .update(books)
    .set({
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(books.id, id))
    .returning({ id: books.id });

  return book ? findById(book.id) : null;
}

export async function restore(id: string): Promise<BookWithDetails | null> {
  const [book] = await db
    .update(books)
    .set({
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(books.id, id))
    .returning({ id: books.id });

  return book ? findById(book.id) : null;
}

export async function deletePermanently(id: string): Promise<BookWithDetails | null> {
  const currentBook = await findById(id);

  if (!currentBook) {
    return null;
  }

  await db.transaction(async (tx) => {
    await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, id));
    await tx.delete(bookEditions).where(eq(bookEditions.bookId, id));
    await tx.delete(books).where(eq(books.id, id));
  });

  return currentBook;
}

export async function findAuthorsByBookId(bookId: string): Promise<BookAuthorSummary[]> {
  const { authorRows } = await findDetailsByBookIds([bookId]);

  return authorRows.map((author) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    photoUrl: author.photoUrl,
    isArchived: author.isArchived,
    sortOrder: author.sortOrder,
  }));
}

export async function findEditionsByBookId(bookId: string): Promise<BookEditionDetails[]> {
  const { editionRows } = await findDetailsByBookIds([bookId]);

  return editionRows;
}
