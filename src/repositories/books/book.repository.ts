import 'server-only';

import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  authors,
  bookCategories,
  bookAuthors,
  bookEditions,
  books,
  categories,
  type Book,
  type NewBookCategory,
  type NewBookEdition,
} from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { BookEditionInput } from '@/schemas/books/book.schema';
import type {
  BookAuthorSummary,
  BookCategorySummary,
  BookDashboardCounts,
  BookDataCreateInput,
  BookDataUpdateInput,
  BookEditionDetails,
  BookRecentItem,
  BookRecentRow,
  BookWithDetails,
} from '@/services/books/book.types';

type BookRow = Book;

interface AuthorSummaryRow extends BookAuthorSummary {
  bookId: string;
}

interface CategorySummaryRow extends BookCategorySummary {
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

function mapBookCategories(categoryRows: CategorySummaryRow[]): Map<string, BookCategorySummary[]> {
  const categoriesByBookId = new Map<string, BookCategorySummary[]>();

  for (const { bookId, ...category } of categoryRows) {
    const currentCategories = categoriesByBookId.get(bookId) ?? [];
    currentCategories.push(category);
    categoriesByBookId.set(bookId, currentCategories);
  }

  return categoriesByBookId;
}

function assembleRecentBooks(
  bookRows: BookRecentRow[],
  authorRows: AuthorSummaryRow[],
): BookRecentItem[] {
  const authorsByBookId = mapBookAuthors(authorRows);

  return bookRows.map((book) => ({
    ...book,
    authors: authorsByBookId.get(book.id) ?? [],
  }));
}

function assembleBooks(
  bookRows: BookRow[],
  authorRows: AuthorSummaryRow[],
  categoryRows: CategorySummaryRow[],
  editionRows: EditionRow[],
): BookWithDetails[] {
  const authorsByBookId = mapBookAuthors(authorRows);
  const categoriesByBookId = mapBookCategories(categoryRows);
  const editionsByBookId = mapBookEditions(editionRows);

  return bookRows.map((book) => ({
    ...book,
    authors: authorsByBookId.get(book.id) ?? [],
    categories: categoriesByBookId.get(book.id) ?? [],
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

function toCategoryInsert(bookId: string, categoryId: string, index: number): NewBookCategory {
  return {
    bookId,
    categoryId,
    sortOrder: index,
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
      categoryRows: [],
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

  const categoryRows = await db
    .select({
      bookId: bookCategories.bookId,
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      isArchived: categories.isArchived,
      sortOrder: bookCategories.sortOrder,
    })
    .from(bookCategories)
    .innerJoin(categories, eq(categories.id, bookCategories.categoryId))
    .where(inArray(bookCategories.bookId, bookIds))
    .orderBy(asc(bookCategories.bookId), asc(bookCategories.sortOrder), asc(categories.name));

  return { authorRows, categoryRows, editionRows };
}

async function findAuthorSummariesByBookIds(bookIds: string[]) {
  if (bookIds.length === 0) {
    return [];
  }

  return db
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
}

async function findOneByBook(book: BookRow | null, onlyAvailableEditions = false) {
  if (!book) {
    return null;
  }

  const { authorRows, categoryRows, editionRows } = await findDetailsByBookIds(
    [book.id],
    onlyAvailableEditions,
  );
  const [bookWithDetails] = assembleBooks([book], authorRows, categoryRows, editionRows);

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
  const { authorRows, categoryRows, editionRows } = await findDetailsByBookIds(
    bookRows.map((book) => book.id),
  );

  return assembleBooks(bookRows, authorRows, categoryRows, editionRows);
}

export async function getDashboardCounts(): Promise<BookDashboardCounts> {
  const [result] = await db
    .select({
      active: sql<number>`count(*) filter (where ${books.isArchived} = false)`.mapWith(Number),
      published:
        sql<number>`count(*) filter (where ${books.isPublished} = true and ${books.isArchived} = false)`.mapWith(
          Number,
        ),
      drafts:
        sql<number>`count(*) filter (where ${books.isPublished} = false and ${books.isArchived} = false)`.mapWith(
          Number,
        ),
      archived: sql<number>`count(*) filter (where ${books.isArchived} = true)`.mapWith(Number),
    })
    .from(books);

  return {
    active: result?.active ?? 0,
    published: result?.published ?? 0,
    drafts: result?.drafts ?? 0,
    archived: result?.archived ?? 0,
  };
}

export async function findRecent(limit = 5): Promise<BookRecentItem[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
  const bookRows = await db
    .select({
      id: books.id,
      title: books.title,
      slug: books.slug,
      coverUrl: books.coverUrl,
      isPublished: books.isPublished,
      createdAt: books.createdAt,
    })
    .from(books)
    .where(eq(books.isArchived, false))
    .orderBy(desc(books.createdAt))
    .limit(safeLimit);
  const authorRows = await findAuthorSummariesByBookIds(bookRows.map((book) => book.id));

  return assembleRecentBooks(bookRows, authorRows);
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
  const { authorRows, categoryRows, editionRows } = await findDetailsByBookIds(
    bookRows.map((book) => book.id),
    true,
  );

  return assembleBooks(bookRows, authorRows, categoryRows, editionRows);
}

export async function findFeaturedPublished(): Promise<BookWithDetails[]> {
  const bookRows = await db
    .select()
    .from(books)
    .where(
      and(eq(books.isFeatured, true), eq(books.isPublished, true), eq(books.isArchived, false)),
    )
    .orderBy(asc(books.sortOrder), desc(books.createdAt), asc(books.title));
  const { authorRows, categoryRows, editionRows } = await findDetailsByBookIds(
    bookRows.map((book) => book.id),
    true,
  );

  return assembleBooks(bookRows, authorRows, categoryRows, editionRows);
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
  categoryIds: string[],
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

    if (categoryIds.length > 0) {
      await tx
        .insert(bookCategories)
        .values(
          categoryIds.map((categoryId, index) => toCategoryInsert(book.id, categoryId, index)),
        );
    }

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
  categoryIds?: string[],
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

    if (categoryIds) {
      await tx.delete(bookCategories).where(eq(bookCategories.bookId, id));

      if (categoryIds.length > 0) {
        await tx
          .insert(bookCategories)
          .values(categoryIds.map((categoryId, index) => toCategoryInsert(id, categoryId, index)));
      }
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
    await tx.delete(bookCategories).where(eq(bookCategories.bookId, id));
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

export async function findCategoriesByBookId(bookId: string): Promise<BookCategorySummary[]> {
  const { categoryRows } = await findDetailsByBookIds([bookId]);

  return categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    isArchived: category.isArchived,
    sortOrder: category.sortOrder,
  }));
}

export async function findEditionsByBookId(bookId: string): Promise<BookEditionDetails[]> {
  const { editionRows } = await findDetailsByBookIds([bookId]);

  return editionRows;
}
