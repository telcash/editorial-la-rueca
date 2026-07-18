import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { Author } from '@/db/schema';
import type { AuthorRepository } from '@/services/authors/author-service.types';
import {
  ArchivedBookAuthorError,
  BookAuthorNotFoundError,
  BookIsbnConflictError,
  BookMustBeArchivedError,
  BookNotFoundError,
  BookSlugConflictError,
} from './book.errors';
import { createBookService } from './book.service.core';
import type { BookRepository, BookWithDetails } from './book.types';

type MockBookRepository = {
  [Key in keyof BookRepository]: Mock<BookRepository[Key]>;
};

type MockAuthorRepository = {
  [Key in keyof AuthorRepository]: Mock<AuthorRepository[Key]>;
};

const bookId = '6b34dbd8-6d3c-41db-86b7-c83f3de68d75';
const authorId = '550e8400-e29b-41d4-a716-446655440000';
const secondAuthorId = '1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61';

const baseAuthor: Author = {
  id: authorId,
  name: 'Ana Autora',
  slug: 'ana-autora',
  shortBio: null,
  biography: null,
  photoUrl: null,
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: null,
  isFeatured: false,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const secondAuthor: Author = {
  ...baseAuthor,
  id: secondAuthorId,
  name: 'Bea Escritora',
  slug: 'bea-escritora',
};

const baseBook: BookWithDetails = {
  id: bookId,
  title: 'El jardin perdido',
  subtitle: null,
  slug: 'el-jardin-perdido',
  description: null,
  excerpt: null,
  coverUrl: null,
  originalPublicationDate: null,
  language: 'es',
  isFeatured: false,
  isPublished: false,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  authors: [
    {
      id: authorId,
      name: 'Ana Autora',
      slug: 'ana-autora',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
  ],
  editions: [
    {
      id: 'a301b33b-aa0d-470f-a6cc-60f0b9dcacbf',
      bookId,
      format: 'paperback',
      editionLabel: null,
      publicationDate: null,
      isbn10: '0306406152',
      isbn13: null,
      price: '18.90',
      currency: 'EUR',
      pages: 120,
      isAvailable: true,
      isFeatured: false,
      sortOrder: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ],
};

function createBookRepositoryMock(): MockBookRepository {
  return {
    findById: vi.fn<BookRepository['findById']>(),
    findBySlug: vi.fn<BookRepository['findBySlug']>(),
    findAll: vi.fn<BookRepository['findAll']>(),
    getDashboardCounts: vi.fn<BookRepository['getDashboardCounts']>(),
    findRecent: vi.fn<BookRepository['findRecent']>(),
    findActive: vi.fn<BookRepository['findActive']>(),
    findArchived: vi.fn<BookRepository['findArchived']>(),
    findPublished: vi.fn<BookRepository['findPublished']>(),
    existsBySlug: vi.fn<BookRepository['existsBySlug']>(),
    existsByIsbn10: vi.fn<BookRepository['existsByIsbn10']>(),
    existsByIsbn13: vi.fn<BookRepository['existsByIsbn13']>(),
    create: vi.fn<BookRepository['create']>(),
    update: vi.fn<BookRepository['update']>(),
    archive: vi.fn<BookRepository['archive']>(),
    restore: vi.fn<BookRepository['restore']>(),
    deletePermanently: vi.fn<BookRepository['deletePermanently']>(),
    findAuthorsByBookId: vi.fn<BookRepository['findAuthorsByBookId']>(),
    findEditionsByBookId: vi.fn<BookRepository['findEditionsByBookId']>(),
  };
}

function createAuthorRepositoryMock(): MockAuthorRepository {
  return {
    findById: vi.fn<AuthorRepository['findById']>(),
    findBySlug: vi.fn<AuthorRepository['findBySlug']>(),
    findByIds: vi.fn<AuthorRepository['findByIds']>(),
    findAll: vi.fn<AuthorRepository['findAll']>(),
    findAllWithBookCount: vi.fn<AuthorRepository['findAllWithBookCount']>(),
    getDashboardCounts: vi.fn<AuthorRepository['getDashboardCounts']>(),
    findRecent: vi.fn<AuthorRepository['findRecent']>(),
    findActive: vi.fn<AuthorRepository['findActive']>(),
    findArchived: vi.fn<AuthorRepository['findArchived']>(),
    findPublished: vi.fn<AuthorRepository['findPublished']>(),
    countBooksByAuthorId: vi.fn<AuthorRepository['countBooksByAuthorId']>(),
    existsBySlug: vi.fn<AuthorRepository['existsBySlug']>(),
    create: vi.fn<AuthorRepository['create']>(),
    update: vi.fn<AuthorRepository['update']>(),
    archive: vi.fn<AuthorRepository['archive']>(),
    restore: vi.fn<AuthorRepository['restore']>(),
    deleteById: vi.fn<AuthorRepository['deleteById']>(),
  };
}

describe('createBookService', () => {
  let bookRepository: MockBookRepository;
  let authorRepository: MockAuthorRepository;
  let service: ReturnType<typeof createBookService>;

  beforeEach(() => {
    bookRepository = createBookRepositoryMock();
    authorRepository = createAuthorRepositoryMock();
    service = createBookService(bookRepository, authorRepository);
  });

  describe('getBookById', () => {
    it('returns an existing book', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);

      await expect(service.getBookById(bookId)).resolves.toBe(baseBook);
    });

    it('throws BookNotFoundError when the book does not exist', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(service.getBookById(bookId)).rejects.toBeInstanceOf(BookNotFoundError);
    });
  });

  describe('getBookBySlug', () => {
    it('normalizes and returns an existing book', async () => {
      bookRepository.findBySlug.mockResolvedValue(baseBook);

      await expect(service.getBookBySlug(' El Jardin Perdido ')).resolves.toBe(baseBook);
      expect(bookRepository.findBySlug).toHaveBeenCalledWith('el-jardin-perdido');
    });

    it('throws BookNotFoundError when the book does not exist', async () => {
      bookRepository.findBySlug.mockResolvedValue(null);

      await expect(service.getBookBySlug('el-jardin-perdido')).rejects.toBeInstanceOf(
        BookNotFoundError,
      );
    });
  });

  it('delegates listing to the repository', async () => {
    bookRepository.findAll.mockResolvedValue([baseBook]);
    bookRepository.findPublished.mockResolvedValue([baseBook]);

    await expect(service.listBooks()).resolves.toEqual([baseBook]);
    expect(bookRepository.findAll).toHaveBeenCalledWith('active');
    await expect(service.listBooks('all')).resolves.toEqual([baseBook]);
    expect(bookRepository.findAll).toHaveBeenCalledWith('all');
    await expect(service.listPublishedBooks()).resolves.toEqual([baseBook]);
  });

  it('delegates active and archived listings to explicit repository methods', async () => {
    bookRepository.findActive.mockResolvedValue([baseBook]);
    bookRepository.findArchived.mockResolvedValue([{ ...baseBook, isArchived: true }]);

    await expect(service.listActiveBooks()).resolves.toEqual([baseBook]);
    await expect(service.listArchivedBooks()).resolves.toEqual([
      expect.objectContaining({ isArchived: true }),
    ]);
  });

  describe('createBook', () => {
    it('creates a book with several authors and editions preserving order', async () => {
      bookRepository.existsBySlug.mockResolvedValue(false);
      bookRepository.existsByIsbn10.mockResolvedValue(false);
      bookRepository.existsByIsbn13.mockResolvedValue(false);
      authorRepository.findByIds.mockResolvedValue([baseAuthor, secondAuthor]);
      bookRepository.create.mockResolvedValue(baseBook);

      await service.createBook({
        title: ' El jardin perdido ',
        slug: 'El Jardin Perdido',
        authorIds: [authorId, secondAuthorId],
        editions: [
          { format: 'paperback', price: '18,90', isbn10: '0-306-40615-2' },
          { format: 'paperback' },
          { format: 'ebook', price: '' },
        ],
      });

      expect(bookRepository.create).toHaveBeenCalledWith(
        {
          title: 'El jardin perdido',
          slug: 'el-jardin-perdido',
          isFeatured: false,
          isPublished: false,
          sortOrder: 0,
        },
        [authorId, secondAuthorId],
        [
          expect.objectContaining({ format: 'paperback', price: '18.90', isbn10: '0306406152' }),
          expect.objectContaining({ format: 'paperback' }),
          expect.objectContaining({ format: 'ebook', price: null }),
        ],
      );
    });

    it('rejects archived authors when creating a book', async () => {
      bookRepository.existsBySlug.mockResolvedValue(false);
      authorRepository.findByIds.mockResolvedValue([{ ...baseAuthor, isArchived: true }]);

      await expect(
        service.createBook({
          title: 'Libro',
          slug: 'libro',
          authorIds: [authorId],
          editions: [{ format: 'paperback' }],
        }),
      ).rejects.toBeInstanceOf(ArchivedBookAuthorError);

      expect(bookRepository.create).not.toHaveBeenCalled();
    });

    it('throws when an author does not exist', async () => {
      bookRepository.existsBySlug.mockResolvedValue(false);
      authorRepository.findByIds.mockResolvedValue([baseAuthor]);

      await expect(
        service.createBook({
          title: 'Libro',
          slug: 'libro',
          authorIds: [authorId, secondAuthorId],
          editions: [{ format: 'paperback' }],
        }),
      ).rejects.toBeInstanceOf(BookAuthorNotFoundError);

      expect(bookRepository.create).not.toHaveBeenCalled();
    });

    it('throws on slug and ISBN conflicts before creating', async () => {
      bookRepository.existsBySlug.mockResolvedValueOnce(true);

      await expect(
        service.createBook({
          title: 'Libro',
          slug: 'libro',
          authorIds: [authorId],
          editions: [{ format: 'paperback' }],
        }),
      ).rejects.toBeInstanceOf(BookSlugConflictError);

      bookRepository.existsBySlug.mockResolvedValue(false);
      authorRepository.findByIds.mockResolvedValue([baseAuthor]);
      bookRepository.existsByIsbn10.mockResolvedValueOnce(true);

      await expect(
        service.createBook({
          title: 'Libro',
          slug: 'libro',
          authorIds: [authorId],
          editions: [{ format: 'paperback', isbn10: '0-306-40615-2' }],
        }),
      ).rejects.toBeInstanceOf(BookIsbnConflictError);

      bookRepository.existsByIsbn10.mockResolvedValue(false);
      bookRepository.existsByIsbn13.mockResolvedValueOnce(true);

      await expect(
        service.createBook({
          title: 'Libro',
          slug: 'libro',
          authorIds: [authorId],
          editions: [{ format: 'paperback', isbn13: '978-0-306-40615-7' }],
        }),
      ).rejects.toBeInstanceOf(BookIsbnConflictError);

      expect(bookRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateBook', () => {
    it('updates only general data when relations are absent', async () => {
      const updatedBook = { ...baseBook, title: 'Nuevo titulo' };
      bookRepository.findById.mockResolvedValue(baseBook);
      bookRepository.update.mockResolvedValue(updatedBook);

      await expect(service.updateBook(bookId, { title: ' Nuevo titulo ' })).resolves.toBe(
        updatedBook,
      );

      expect(bookRepository.update).toHaveBeenCalledWith(
        bookId,
        { title: 'Nuevo titulo' },
        undefined,
        undefined,
      );
    });

    it('replaces authors and editions only when present', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);
      bookRepository.existsByIsbn10.mockResolvedValue(false);
      bookRepository.existsByIsbn13.mockResolvedValue(false);
      authorRepository.findByIds.mockResolvedValue([secondAuthor]);
      bookRepository.update.mockResolvedValue({
        ...baseBook,
        authors: [
          {
            id: secondAuthorId,
            name: 'Bea Escritora',
            slug: 'bea-escritora',
            photoUrl: null,
            isArchived: false,
            sortOrder: 0,
          },
        ],
      });

      await service.updateBook(bookId, {
        authorIds: [secondAuthorId],
        editions: [{ format: 'ebook', isbn13: '978-0-306-40615-7' }],
      });

      expect(bookRepository.update).toHaveBeenCalledWith(
        bookId,
        {},
        [secondAuthorId],
        [expect.objectContaining({ format: 'ebook', isbn13: '9780306406157' })],
      );
      expect(bookRepository.existsByIsbn13).toHaveBeenCalledWith(
        '9780306406157',
        bookId,
        undefined,
      );
    });

    it('throws when the book does not exist', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(service.updateBook(bookId, { title: 'Nuevo titulo' })).rejects.toBeInstanceOf(
        BookNotFoundError,
      );
    });

    it('rejects invalid relation payloads', async () => {
      await expect(service.updateBook(bookId, { authorIds: [] })).rejects.toThrow();
      await expect(service.updateBook(bookId, { editions: [] })).rejects.toThrow();
      expect(bookRepository.findById).not.toHaveBeenCalled();
    });

    it('checks conflicts when slug or ISBN changes', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);
      bookRepository.existsBySlug.mockResolvedValue(true);

      await expect(service.updateBook(bookId, { slug: 'Nuevo Libro' })).rejects.toBeInstanceOf(
        BookSlugConflictError,
      );

      bookRepository.existsBySlug.mockResolvedValue(false);
      bookRepository.existsByIsbn10.mockResolvedValue(true);

      await expect(
        service.updateBook(bookId, {
          editions: [{ format: 'paperback', isbn10: '0-306-40615-2' }],
        }),
      ).rejects.toBeInstanceOf(BookIsbnConflictError);
    });

    it('throws when a replacement author does not exist', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);
      authorRepository.findByIds.mockResolvedValue([]);

      await expect(
        service.updateBook(bookId, { authorIds: [secondAuthorId] }),
      ).rejects.toBeInstanceOf(BookAuthorNotFoundError);

      expect(bookRepository.update).not.toHaveBeenCalled();
    });

    it('allows preserving an archived author already related to the book', async () => {
      const archivedAuthor = { ...baseAuthor, isArchived: true };
      bookRepository.findById.mockResolvedValue({
        ...baseBook,
        authors: [{ ...baseBook.authors[0]!, isArchived: true }],
      });
      authorRepository.findByIds.mockResolvedValue([archivedAuthor, secondAuthor]);
      bookRepository.update.mockResolvedValue(baseBook);

      await service.updateBook(bookId, {
        authorIds: [authorId, secondAuthorId],
      });

      expect(bookRepository.update).toHaveBeenCalledWith(
        bookId,
        {},
        [authorId, secondAuthorId],
        undefined,
      );
    });

    it('rejects adding a new archived author while editing', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);
      authorRepository.findByIds.mockResolvedValue([{ ...secondAuthor, isArchived: true }]);

      await expect(
        service.updateBook(bookId, { authorIds: [secondAuthorId] }),
      ).rejects.toBeInstanceOf(ArchivedBookAuthorError);

      expect(bookRepository.update).not.toHaveBeenCalled();
    });

    it('allows removing an existing archived author from the book', async () => {
      bookRepository.findById.mockResolvedValue({
        ...baseBook,
        authors: [{ ...baseBook.authors[0]!, isArchived: true }],
      });
      authorRepository.findByIds.mockResolvedValue([secondAuthor]);
      bookRepository.update.mockResolvedValue(baseBook);

      await service.updateBook(bookId, { authorIds: [secondAuthorId] });

      expect(bookRepository.update).toHaveBeenCalledWith(bookId, {}, [secondAuthorId], undefined);
    });
  });

  describe('archiveBook', () => {
    it('archives an active book', async () => {
      const archivedBook = { ...baseBook, isArchived: true, archivedAt: new Date() };
      bookRepository.findById.mockResolvedValue(baseBook);
      bookRepository.archive.mockResolvedValue(archivedBook);

      await expect(service.archiveBook(bookId)).resolves.toBe(archivedBook);
      expect(bookRepository.archive).toHaveBeenCalledWith(bookId);
    });

    it('is idempotent when the book is already archived', async () => {
      const archivedBook = { ...baseBook, isArchived: true };
      bookRepository.findById.mockResolvedValue(archivedBook);

      await expect(service.archiveBook(bookId)).resolves.toBe(archivedBook);
      expect(bookRepository.archive).not.toHaveBeenCalled();
    });

    it('throws BookNotFoundError when archiving an unknown book', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(service.archiveBook(bookId)).rejects.toBeInstanceOf(BookNotFoundError);
    });
  });

  describe('restoreBook', () => {
    it('restores an archived book', async () => {
      const archivedBook = { ...baseBook, isArchived: true, archivedAt: new Date() };
      const restoredBook = { ...baseBook, isArchived: false, archivedAt: null };
      bookRepository.findById.mockResolvedValue(archivedBook);
      bookRepository.restore.mockResolvedValue(restoredBook);

      await expect(service.restoreBook(bookId)).resolves.toBe(restoredBook);
      expect(bookRepository.restore).toHaveBeenCalledWith(bookId);
    });

    it('is idempotent when the book is already active', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);

      await expect(service.restoreBook(bookId)).resolves.toBe(baseBook);
      expect(bookRepository.restore).not.toHaveBeenCalled();
    });

    it('throws BookNotFoundError when restoring an unknown book', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(service.restoreBook(bookId)).rejects.toBeInstanceOf(BookNotFoundError);
    });
  });

  describe('deleteBookPermanently', () => {
    it('deletes an archived book', async () => {
      const archivedBook = { ...baseBook, isArchived: true };
      bookRepository.findById.mockResolvedValue(archivedBook);
      bookRepository.deletePermanently.mockResolvedValue(archivedBook);

      await expect(service.deleteBookPermanently(bookId)).resolves.toBe(archivedBook);
      expect(bookRepository.deletePermanently).toHaveBeenCalledWith(bookId);
    });

    it('rejects active books', async () => {
      bookRepository.findById.mockResolvedValue(baseBook);

      await expect(service.deleteBookPermanently(bookId)).rejects.toBeInstanceOf(
        BookMustBeArchivedError,
      );

      expect(bookRepository.deletePermanently).not.toHaveBeenCalled();
    });

    it('throws BookNotFoundError for unknown books', async () => {
      bookRepository.findById.mockResolvedValue(null);

      await expect(service.deleteBookPermanently(bookId)).rejects.toBeInstanceOf(BookNotFoundError);
    });

    it('throws BookNotFoundError if delete returns null', async () => {
      bookRepository.findById.mockResolvedValue({ ...baseBook, isArchived: true });
      bookRepository.deletePermanently.mockResolvedValue(null);

      await expect(service.deleteBookPermanently(bookId)).rejects.toBeInstanceOf(BookNotFoundError);
    });
  });
});
