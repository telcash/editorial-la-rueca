import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { createPublicHomeService } from './public-home.service.core';
import type { PublicHomeAuthorRepository, PublicHomeBookRepository } from './public-home.types';

type MockAuthorRepository = {
  [Key in keyof PublicHomeAuthorRepository]: Mock<PublicHomeAuthorRepository[Key]>;
};

type MockBookRepository = {
  [Key in keyof PublicHomeBookRepository]: Mock<PublicHomeBookRepository[Key]>;
};

describe('createPublicHomeService', () => {
  let authorRepository: MockAuthorRepository;
  let bookRepository: MockBookRepository;
  let service: ReturnType<typeof createPublicHomeService>;

  beforeEach(() => {
    authorRepository = {
      getDashboardCounts: vi.fn<PublicHomeAuthorRepository['getDashboardCounts']>(),
    };
    bookRepository = {
      getDashboardCounts: vi.fn<PublicHomeBookRepository['getDashboardCounts']>(),
    };
    service = createPublicHomeService(authorRepository, bookRepository);
  });

  it('returns public metrics from aggregated repository counts', async () => {
    authorRepository.getDashboardCounts.mockResolvedValue({ active: 12, archived: 2 });
    bookRepository.getDashboardCounts.mockResolvedValue({
      active: 20,
      published: 15,
      drafts: 5,
      archived: 1,
    });

    await expect(service.getPublicHomeMetrics()).resolves.toEqual({
      publishedBooks: 15,
      activeAuthors: 12,
    });
  });
});
