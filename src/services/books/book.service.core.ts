import { z } from 'zod';

import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type { AuthorRepository } from '@/services/authors/author-service.types';
import {
  createBookSchema,
  updateBookSchema,
  type BookEditionInput,
  type CreateBookInput,
  type UpdateBookInput,
} from '@/schemas/books/book.schema';
import {
  ArchivedBookAuthorError,
  BookAuthorNotFoundError,
  BookIsbnConflictError,
  BookNotFoundError,
  BookRequiresAuthorError,
  BookRequiresEditionError,
  BookSlugConflictError,
  DuplicateBookAuthorError,
} from './book.errors';
import type { BookDataCreateInput, BookDataUpdateInput, BookRepository } from './book.types';

const bookIdSchema = z.string().uuid('El id del libro debe ser un UUID valido.');
const bookSlugSchema = createBookSchema.shape.slug;

function assertUniqueAuthorIds(authorIds: string[]) {
  if (authorIds.length === 0) {
    throw new BookRequiresAuthorError();
  }

  if (new Set(authorIds).size !== authorIds.length) {
    throw new DuplicateBookAuthorError();
  }
}

function assertHasEditions(editions: BookEditionInput[]) {
  if (editions.length === 0) {
    throw new BookRequiresEditionError();
  }
}

function splitCreateInput(data: CreateBookInput) {
  const { authorIds, editions, ...bookData } = data;

  return { bookData, authorIds, editions };
}

function splitUpdateInput(data: UpdateBookInput) {
  const { authorIds, editions, ...bookData } = data;

  return { bookData, authorIds, editions };
}

async function assertAuthorsCanBeRelated(
  repository: AuthorRepository,
  authorIds: string[],
  allowedArchivedAuthorIds: string[] = [],
) {
  assertUniqueAuthorIds(authorIds);

  const foundAuthors = await repository.findByIds(authorIds);
  const foundAuthorIds = new Set(foundAuthors.map((author) => author.id));
  const missingAuthorIds = authorIds.filter((authorId) => !foundAuthorIds.has(authorId));

  if (missingAuthorIds.length > 0) {
    throw new BookAuthorNotFoundError(missingAuthorIds);
  }

  const allowedArchivedAuthorIdSet = new Set(allowedArchivedAuthorIds);
  const archivedAuthorIds = foundAuthors
    .filter((author) => author.isArchived && !allowedArchivedAuthorIdSet.has(author.id))
    .map((author) => author.id);

  if (archivedAuthorIds.length > 0) {
    throw new ArchivedBookAuthorError(archivedAuthorIds);
  }
}

async function assertIsbnAvailability(
  repository: BookRepository,
  editions: BookEditionInput[],
  excludeBookId?: string,
) {
  for (const edition of editions) {
    if (edition.isbn10) {
      const isbnExists = await repository.existsByIsbn10(edition.isbn10, excludeBookId, edition.id);

      if (isbnExists) {
        throw new BookIsbnConflictError('isbn10', edition.isbn10);
      }
    }

    if (edition.isbn13) {
      const isbnExists = await repository.existsByIsbn13(edition.isbn13, excludeBookId, edition.id);

      if (isbnExists) {
        throw new BookIsbnConflictError('isbn13', edition.isbn13);
      }
    }
  }
}

export function createBookService(
  bookRepository: BookRepository,
  authorRepository: AuthorRepository,
) {
  return {
    async getBookById(id: string) {
      const validId = bookIdSchema.parse(id);
      const book = await bookRepository.findById(validId);

      if (!book) {
        throw new BookNotFoundError(validId);
      }

      return book;
    },

    async getBookBySlug(slug: string) {
      const validSlug = bookSlugSchema.parse(slug);
      const book = await bookRepository.findBySlug(validSlug);

      if (!book) {
        throw new BookNotFoundError(validSlug);
      }

      return book;
    },

    async listBooks(status: ArchiveStatus = 'active') {
      return bookRepository.findAll(status);
    },

    async listActiveBooks() {
      return bookRepository.findActive();
    },

    async listArchivedBooks() {
      return bookRepository.findArchived();
    },

    async listPublishedBooks() {
      return bookRepository.findPublished();
    },

    async createBook(input: unknown) {
      const data = createBookSchema.parse(input);
      const { bookData, authorIds, editions } = splitCreateInput(data);

      assertUniqueAuthorIds(authorIds);
      assertHasEditions(editions);

      const slugExists = await bookRepository.existsBySlug(bookData.slug);

      if (slugExists) {
        throw new BookSlugConflictError(bookData.slug);
      }

      await assertAuthorsCanBeRelated(authorRepository, authorIds);
      await assertIsbnAvailability(bookRepository, editions);

      return bookRepository.create(bookData satisfies BookDataCreateInput, authorIds, editions);
    },

    async updateBook(id: string, input: unknown) {
      const validId = bookIdSchema.parse(id);
      const data = updateBookSchema.parse(input);
      const currentBook = await bookRepository.findById(validId);

      if (!currentBook) {
        throw new BookNotFoundError(validId);
      }

      const { bookData, authorIds, editions } = splitUpdateInput(data);

      if (bookData.slug && bookData.slug !== currentBook.slug) {
        const slugExists = await bookRepository.existsBySlug(bookData.slug, validId);

        if (slugExists) {
          throw new BookSlugConflictError(bookData.slug);
        }
      }

      if (authorIds) {
        const existingArchivedAuthorIds = currentBook.authors
          .filter((author) => author.isArchived)
          .map((author) => author.id);

        await assertAuthorsCanBeRelated(authorRepository, authorIds, existingArchivedAuthorIds);
      }

      if (editions) {
        assertHasEditions(editions);
        await assertIsbnAvailability(bookRepository, editions, validId);
      }

      const updatedBook = await bookRepository.update(
        validId,
        bookData satisfies BookDataUpdateInput,
        authorIds,
        editions,
      );

      if (!updatedBook) {
        throw new BookNotFoundError(validId);
      }

      return updatedBook;
    },

    async archiveBook(id: string) {
      const validId = bookIdSchema.parse(id);
      const currentBook = await bookRepository.findById(validId);

      if (!currentBook) {
        throw new BookNotFoundError(validId);
      }

      if (currentBook.isArchived) {
        return currentBook;
      }

      const archivedBook = await bookRepository.archive(validId);

      if (!archivedBook) {
        throw new BookNotFoundError(validId);
      }

      return archivedBook;
    },

    async restoreBook(id: string) {
      const validId = bookIdSchema.parse(id);
      const currentBook = await bookRepository.findById(validId);

      if (!currentBook) {
        throw new BookNotFoundError(validId);
      }

      if (!currentBook.isArchived) {
        return currentBook;
      }

      const restoredBook = await bookRepository.restore(validId);

      if (!restoredBook) {
        throw new BookNotFoundError(validId);
      }

      return restoredBook;
    },
  };
}
