import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { Author } from '@/db/schema';
import {
  AuthorHasBooksError,
  AuthorMustBeArchivedError,
  AuthorNotFoundError,
  AuthorSlugConflictError,
} from './author.errors';
import type { AuthorRepository } from './author-service.types';
import { createAuthorService } from './author.service.core';

type MockAuthorRepository = {
  [Key in keyof AuthorRepository]: Mock<AuthorRepository[Key]>;
};

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
  sortOrder: 1,
};

function createRepositoryMock(): MockAuthorRepository {
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

describe('createAuthorService', () => {
  let repository: MockAuthorRepository;
  let service: ReturnType<typeof createAuthorService>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = createAuthorService(repository);
  });

  describe('getAuthorById', () => {
    it('validates UUIDs before calling the repository', async () => {
      await expect(service.getAuthorById('not-a-uuid')).rejects.toThrow();

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('returns the author when it exists', async () => {
      repository.findById.mockResolvedValue(baseAuthor);

      await expect(service.getAuthorById(authorId)).resolves.toBe(baseAuthor);
      expect(repository.findById).toHaveBeenCalledWith(authorId);
    });

    it('throws AuthorNotFoundError when the author does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getAuthorById(authorId)).rejects.toBeInstanceOf(AuthorNotFoundError);
    });
  });

  describe('getAuthorBySlug', () => {
    it('normalizes slug before querying', async () => {
      repository.findBySlug.mockResolvedValue(baseAuthor);

      await service.getAuthorBySlug(' Ana__Autora ');

      expect(repository.findBySlug).toHaveBeenCalledWith('ana-autora');
    });

    it('returns the author when it exists', async () => {
      repository.findBySlug.mockResolvedValue(baseAuthor);

      await expect(service.getAuthorBySlug('ana-autora')).resolves.toBe(baseAuthor);
    });

    it('throws AuthorNotFoundError when the author does not exist', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.getAuthorBySlug('ana-autora')).rejects.toBeInstanceOf(
        AuthorNotFoundError,
      );
    });

    it('does not query the repository when slug is invalid after normalization', async () => {
      await expect(service.getAuthorBySlug('!!!')).rejects.toThrow();

      expect(repository.findBySlug).not.toHaveBeenCalled();
    });
  });

  it('listAuthors delegates to findAll and returns its result', async () => {
    const authors = [baseAuthor, secondAuthor];
    repository.findAll.mockResolvedValue(authors);

    await expect(service.listAuthors()).resolves.toBe(authors);
    expect(repository.findAll).toHaveBeenCalledWith('active');
    await expect(service.listAuthors('archived')).resolves.toBe(authors);
    expect(repository.findAll).toHaveBeenCalledWith('archived');
  });

  it('listAuthorsForAdmin delegates to the aggregated admin list', async () => {
    const adminRows = [{ author: baseAuthor, bookCount: 2 }];
    repository.findAllWithBookCount.mockResolvedValue(adminRows);

    await expect(service.listAuthorsForAdmin('all')).resolves.toBe(adminRows);
    expect(repository.findAllWithBookCount).toHaveBeenCalledWith('all');
  });

  it('listActiveAuthors and listArchivedAuthors delegate to explicit repository methods', async () => {
    repository.findActive.mockResolvedValue([baseAuthor]);
    repository.findArchived.mockResolvedValue([{ ...baseAuthor, isArchived: true }]);

    await expect(service.listActiveAuthors()).resolves.toEqual([baseAuthor]);
    await expect(service.listArchivedAuthors()).resolves.toEqual([
      expect.objectContaining({ isArchived: true }),
    ]);
  });

  it('listPublishedAuthors delegates to findPublished and returns its result', async () => {
    const authors = [baseAuthor];
    repository.findPublished.mockResolvedValue(authors);

    await expect(service.listPublishedAuthors()).resolves.toBe(authors);
    expect(repository.findPublished).toHaveBeenCalledOnce();
  });

  describe('createAuthor', () => {
    it('validates, normalizes, applies defaults and creates an author', async () => {
      repository.existsBySlug.mockResolvedValue(false);
      repository.create.mockResolvedValue(baseAuthor);

      await expect(
        service.createAuthor({
          name: ' Ana Autora ',
          slug: ' Ana__Autora ',
        }),
      ).resolves.toBe(baseAuthor);

      expect(repository.existsBySlug).toHaveBeenCalledWith('ana-autora');
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Ana Autora',
        slug: 'ana-autora',
        isFeatured: false,
        isPublished: false,
        sortOrder: 0,
      });
    });

    it('passes only validated fields to the repository', async () => {
      repository.existsBySlug.mockResolvedValue(false);
      repository.create.mockResolvedValue(baseAuthor);

      await service.createAuthor({
        name: 'Ana Autora',
        slug: 'ana-autora',
        shortBio: '',
        biography: '',
        websiteUrl: 'https://example.com',
      });

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Ana Autora',
        slug: 'ana-autora',
        shortBio: null,
        biography: null,
        websiteUrl: 'https://example.com',
        isFeatured: false,
        isPublished: false,
        sortOrder: 0,
      });
    });

    it('throws AuthorSlugConflictError when slug already exists', async () => {
      repository.existsBySlug.mockResolvedValue(true);

      await expect(
        service.createAuthor({
          name: 'Ana Autora',
          slug: 'ana-autora',
        }),
      ).rejects.toBeInstanceOf(AuthorSlugConflictError);

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not call the repository when validation fails', async () => {
      await expect(service.createAuthor({ name: 'A', slug: '!!!' })).rejects.toThrow();

      expect(repository.existsBySlug).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAuthor', () => {
    it('validates UUIDs before calling the repository', async () => {
      await expect(service.updateAuthor('not-a-uuid', { name: 'Nombre Valido' })).rejects.toThrow();

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('rejects invalid and empty input before calling the repository', async () => {
      await expect(service.updateAuthor(authorId, {})).rejects.toThrow();
      await expect(service.updateAuthor(authorId, { id: secondAuthorId })).rejects.toThrow();
      await expect(service.updateAuthor(authorId, { createdAt: new Date() })).rejects.toThrow();
      await expect(service.updateAuthor(authorId, { updatedAt: new Date() })).rejects.toThrow();

      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('checks the existing author first and throws when it does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateAuthor(authorId, { name: 'Nombre Valido' }),
      ).rejects.toBeInstanceOf(AuthorNotFoundError);

      expect(repository.findById).toHaveBeenCalledWith(authorId);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('does not check slug uniqueness when slug does not change', async () => {
      repository.findById.mockResolvedValue(baseAuthor);
      repository.update.mockResolvedValue({ ...baseAuthor, name: 'Nombre Nuevo' });

      await service.updateAuthor(authorId, {
        name: ' Nombre Nuevo ',
        slug: 'ana-autora',
      });

      expect(repository.existsBySlug).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(authorId, {
        name: 'Nombre Nuevo',
        slug: 'ana-autora',
      });
    });

    it('checks slug uniqueness excluding the current author when slug changes', async () => {
      repository.findById.mockResolvedValue(baseAuthor);
      repository.existsBySlug.mockResolvedValue(false);
      repository.update.mockResolvedValue({ ...baseAuthor, slug: 'nuevo-slug' });

      await service.updateAuthor(authorId, { slug: 'Nuevo Slug' });

      expect(repository.existsBySlug).toHaveBeenCalledWith('nuevo-slug', authorId);
      expect(repository.update).toHaveBeenCalledWith(authorId, { slug: 'nuevo-slug' });
    });

    it('throws AuthorSlugConflictError when the new slug is already taken', async () => {
      repository.findById.mockResolvedValue(baseAuthor);
      repository.existsBySlug.mockResolvedValue(true);

      await expect(service.updateAuthor(authorId, { slug: 'Nuevo Slug' })).rejects.toBeInstanceOf(
        AuthorSlugConflictError,
      );

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates correctly when there is no conflict', async () => {
      const updatedAuthor = { ...baseAuthor, name: 'Nombre Nuevo' };
      repository.findById.mockResolvedValue(baseAuthor);
      repository.update.mockResolvedValue(updatedAuthor);

      await expect(service.updateAuthor(authorId, { name: 'Nombre Nuevo' })).resolves.toBe(
        updatedAuthor,
      );
    });

    it('throws AuthorNotFoundError if update returns null', async () => {
      repository.findById.mockResolvedValue(baseAuthor);
      repository.update.mockResolvedValue(null);

      await expect(service.updateAuthor(authorId, { name: 'Nombre Nuevo' })).rejects.toBeInstanceOf(
        AuthorNotFoundError,
      );
    });
  });

  describe('archiveAuthor', () => {
    it('archives an active author', async () => {
      const archivedAuthor = {
        ...baseAuthor,
        isArchived: true,
        archivedAt: new Date('2026-02-01T00:00:00.000Z'),
      };
      repository.findById.mockResolvedValue(baseAuthor);
      repository.archive.mockResolvedValue(archivedAuthor);

      await expect(service.archiveAuthor(authorId)).resolves.toBe(archivedAuthor);
      expect(repository.archive).toHaveBeenCalledWith(authorId);
    });

    it('is idempotent when the author is already archived', async () => {
      const archivedAuthor = { ...baseAuthor, isArchived: true };
      repository.findById.mockResolvedValue(archivedAuthor);

      await expect(service.archiveAuthor(authorId)).resolves.toBe(archivedAuthor);
      expect(repository.archive).not.toHaveBeenCalled();
    });

    it('throws AuthorNotFoundError when archiving an unknown author', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.archiveAuthor(authorId)).rejects.toBeInstanceOf(AuthorNotFoundError);
    });
  });

  describe('restoreAuthor', () => {
    it('restores an archived author', async () => {
      const archivedAuthor = {
        ...baseAuthor,
        isArchived: true,
        archivedAt: new Date('2026-02-01T00:00:00.000Z'),
      };
      const restoredAuthor = { ...baseAuthor, isArchived: false, archivedAt: null };
      repository.findById.mockResolvedValue(archivedAuthor);
      repository.restore.mockResolvedValue(restoredAuthor);

      await expect(service.restoreAuthor(authorId)).resolves.toBe(restoredAuthor);
      expect(repository.restore).toHaveBeenCalledWith(authorId);
    });

    it('is idempotent when the author is already active', async () => {
      repository.findById.mockResolvedValue(baseAuthor);

      await expect(service.restoreAuthor(authorId)).resolves.toBe(baseAuthor);
      expect(repository.restore).not.toHaveBeenCalled();
    });

    it('throws AuthorNotFoundError when restoring an unknown author', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.restoreAuthor(authorId)).rejects.toBeInstanceOf(AuthorNotFoundError);
    });
  });

  describe('deleteAuthorPermanently', () => {
    it('deletes an archived author without book relations', async () => {
      const archivedAuthor = { ...baseAuthor, isArchived: true };
      repository.findById.mockResolvedValue(archivedAuthor);
      repository.countBooksByAuthorId.mockResolvedValue(0);
      repository.deleteById.mockResolvedValue(archivedAuthor);

      await expect(service.deleteAuthorPermanently(authorId)).resolves.toBe(archivedAuthor);
      expect(repository.countBooksByAuthorId).toHaveBeenCalledWith(authorId);
      expect(repository.deleteById).toHaveBeenCalledWith(authorId);
    });

    it('rejects active authors', async () => {
      repository.findById.mockResolvedValue(baseAuthor);

      await expect(service.deleteAuthorPermanently(authorId)).rejects.toBeInstanceOf(
        AuthorMustBeArchivedError,
      );

      expect(repository.countBooksByAuthorId).not.toHaveBeenCalled();
      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('rejects archived authors with one book relation', async () => {
      repository.findById.mockResolvedValue({ ...baseAuthor, isArchived: true });
      repository.countBooksByAuthorId.mockResolvedValue(1);

      await expect(service.deleteAuthorPermanently(authorId)).rejects.toBeInstanceOf(
        AuthorHasBooksError,
      );

      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('rejects archived authors with several book relations', async () => {
      repository.findById.mockResolvedValue({ ...baseAuthor, isArchived: true });
      repository.countBooksByAuthorId.mockResolvedValue(3);

      await expect(service.deleteAuthorPermanently(authorId)).rejects.toMatchObject({
        bookCount: 3,
      });

      expect(repository.deleteById).not.toHaveBeenCalled();
    });

    it('throws AuthorNotFoundError for unknown authors', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteAuthorPermanently(authorId)).rejects.toBeInstanceOf(
        AuthorNotFoundError,
      );
    });

    it('converts concurrent foreign key violations to AuthorHasBooksError', async () => {
      const archivedAuthor = { ...baseAuthor, isArchived: true };
      repository.findById.mockResolvedValue(archivedAuthor);
      repository.countBooksByAuthorId.mockResolvedValue(0);
      repository.deleteById.mockRejectedValue({ code: '23503' });

      await expect(service.deleteAuthorPermanently(authorId)).rejects.toBeInstanceOf(
        AuthorHasBooksError,
      );
    });

    it('does not delete relations explicitly', async () => {
      const archivedAuthor = { ...baseAuthor, isArchived: true };
      repository.findById.mockResolvedValue(archivedAuthor);
      repository.countBooksByAuthorId.mockResolvedValue(0);
      repository.deleteById.mockResolvedValue(archivedAuthor);

      await service.deleteAuthorPermanently(authorId);

      expect(repository.deleteById).toHaveBeenCalledWith(authorId);
    });
  });
});
