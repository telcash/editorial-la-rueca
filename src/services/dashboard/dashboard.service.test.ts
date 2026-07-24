import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { DashboardAuthorRepository, DashboardBookRepository } from './dashboard.types';
import { createDashboardService } from './dashboard.service.core';

type MockDashboardAuthorRepository = {
  [Key in keyof DashboardAuthorRepository]: Mock<DashboardAuthorRepository[Key]>;
};

type MockDashboardBookRepository = {
  [Key in keyof DashboardBookRepository]: Mock<DashboardBookRepository[Key]>;
};

const bookId = '6b34dbd8-6d3c-41db-86b7-c83f3de68d75';
const authorId = '550e8400-e29b-41d4-a716-446655440000';
const createdAt = new Date('2026-07-18T10:00:00.000Z');

function createAuthorRepositoryMock(): MockDashboardAuthorRepository {
  return {
    getDashboardCounts: vi.fn<DashboardAuthorRepository['getDashboardCounts']>(),
    findRecent: vi.fn<DashboardAuthorRepository['findRecent']>(),
  };
}

function createBookRepositoryMock(): MockDashboardBookRepository {
  return {
    getDashboardCounts: vi.fn<DashboardBookRepository['getDashboardCounts']>(),
    findRecent: vi.fn<DashboardBookRepository['findRecent']>(),
  };
}

describe('createDashboardService', () => {
  let authorRepository: MockDashboardAuthorRepository;
  let bookRepository: MockDashboardBookRepository;
  let service: ReturnType<typeof createDashboardService>;

  beforeEach(() => {
    authorRepository = createAuthorRepositoryMock();
    bookRepository = createBookRepositoryMock();
    service = createDashboardService(authorRepository, bookRepository);

    authorRepository.getDashboardCounts.mockResolvedValue({
      active: 3,
      archived: 1,
      withoutPhoto: 2,
    });
    bookRepository.getDashboardCounts.mockResolvedValue({
      active: 7,
      published: 5,
      drafts: 2,
      archived: 4,
      withoutCover: 3,
    });
    bookRepository.findRecent.mockResolvedValue([
      {
        id: bookId,
        title: 'Libro reciente',
        slug: 'libro-reciente',
        coverUrl: null,
        isPublished: true,
        createdAt,
        updatedAt: createdAt,
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
      },
    ]);
    authorRepository.findRecent.mockResolvedValue([
      {
        id: authorId,
        name: 'Ana Autora',
        slug: 'ana-autora',
        photoUrl: null,
        isPublished: true,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  });

  it('combines dashboard metrics and recent records', async () => {
    await expect(service.getDashboardData()).resolves.toEqual({
      metrics: {
        authorsActive: 3,
        authorsArchived: 1,
        authorsWithoutPhoto: 2,
        booksActive: 7,
        booksPublished: 5,
        booksDraft: 2,
        booksArchived: 4,
        booksWithoutCover: 3,
      },
      recentBooks: expect.arrayContaining([expect.objectContaining({ title: 'Libro reciente' })]),
      recentAuthors: expect.arrayContaining([expect.objectContaining({ name: 'Ana Autora' })]),
    });
  });

  it('requests five recent records from each repository', async () => {
    await service.getDashboardData();

    expect(bookRepository.findRecent).toHaveBeenCalledWith(5);
    expect(authorRepository.findRecent).toHaveBeenCalledWith(5);
  });

  it('supports empty recent lists and zero counts', async () => {
    authorRepository.getDashboardCounts.mockResolvedValue({
      active: 0,
      archived: 0,
      withoutPhoto: 0,
    });
    bookRepository.getDashboardCounts.mockResolvedValue({
      active: 0,
      published: 0,
      drafts: 0,
      archived: 0,
      withoutCover: 0,
    });
    bookRepository.findRecent.mockResolvedValue([]);
    authorRepository.findRecent.mockResolvedValue([]);

    await expect(service.getDashboardData()).resolves.toEqual({
      metrics: {
        authorsActive: 0,
        authorsArchived: 0,
        authorsWithoutPhoto: 0,
        booksActive: 0,
        booksPublished: 0,
        booksDraft: 0,
        booksArchived: 0,
        booksWithoutCover: 0,
      },
      recentBooks: [],
      recentAuthors: [],
    });
  });

  it('returns repository data without mutating it', async () => {
    const recentBooks = await bookRepository.findRecent();
    const recentAuthors = await authorRepository.findRecent();

    const result = await service.getDashboardData();

    expect(result.recentBooks).toBe(recentBooks);
    expect(result.recentAuthors).toBe(recentAuthors);
  });

  it('propagates repository errors', async () => {
    const error = new Error('database failed');
    bookRepository.getDashboardCounts.mockRejectedValue(error);

    await expect(service.getDashboardData()).rejects.toBe(error);
  });
});
