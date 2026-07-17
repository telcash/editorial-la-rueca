import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { Author } from '@/db/schema';
import { AuthorNotFoundError, AuthorSlugConflictError } from './author.errors';
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
    findPublished: vi.fn<AuthorRepository['findPublished']>(),
    existsBySlug: vi.fn<AuthorRepository['existsBySlug']>(),
    create: vi.fn<AuthorRepository['create']>(),
    update: vi.fn<AuthorRepository['update']>(),
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
    expect(repository.findAll).toHaveBeenCalledOnce();
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
});
