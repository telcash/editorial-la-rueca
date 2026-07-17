import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { Author } from '@/db/schema';
import type { AuthorRepository } from '@/services/authors/author-service.types';
import {
  BookAuthorNotFoundError,
  BookIsbnConflictError,
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
    findPublished: vi.fn<BookRepository['findPublished']>(),
    existsBySlug: vi.fn<BookRepository['existsBySlug']>(),
    existsByIsbn10: vi.fn<BookRepository['existsByIsbn10']>(),
    existsByIsbn13: vi.fn<BookRepository['existsByIsbn13']>(),
    create: vi.fn<BookRepository['create']>(),
    update: vi.fn<BookRepository['update']>(),
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
    findPublished: vi.fn<AuthorRepository['findPublished']>(),
    existsBySlug: vi.fn<AuthorRepository['existsBySlug']>(),
    create: vi.fn<AuthorRepository['create']>(),
    update: vi.fn<AuthorRepository['update']>(),
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
    await expect(service.listPublishedBooks()).resolves.toEqual([baseBook]);
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
  });
});
