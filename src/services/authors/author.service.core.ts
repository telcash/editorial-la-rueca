import { z } from 'zod';

import {
  createAuthorSchema,
  updateAuthorSchema,
  type CreateAuthorInput,
  type UpdateAuthorInput,
} from '@/schemas/authors/author.schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import { AuthorNotFoundError, AuthorSlugConflictError } from './author.errors';
import type { AuthorRepository } from './author-service.types';

const authorIdSchema = z.string().uuid('El id del autor debe ser un UUID valido.');
const authorSlugSchema = createAuthorSchema.shape.slug;

export function createAuthorService(repository: AuthorRepository) {
  return {
    async getAuthorById(id: string) {
      const validId = authorIdSchema.parse(id);
      const author = await repository.findById(validId);

      if (!author) {
        throw new AuthorNotFoundError(validId);
      }

      return author;
    },

    async getAuthorBySlug(slug: string) {
      const validSlug = authorSlugSchema.parse(slug);
      const author = await repository.findBySlug(validSlug);

      if (!author) {
        throw new AuthorNotFoundError(validSlug);
      }

      return author;
    },

    async listAuthors(status: ArchiveStatus = 'active') {
      return repository.findAll(status);
    },

    async listActiveAuthors() {
      return repository.findActive();
    },

    async listArchivedAuthors() {
      return repository.findArchived();
    },

    async listPublishedAuthors() {
      return repository.findPublished();
    },

    async createAuthor(input: unknown) {
      const data: CreateAuthorInput = createAuthorSchema.parse(input);
      const slugExists = await repository.existsBySlug(data.slug);

      if (slugExists) {
        throw new AuthorSlugConflictError(data.slug);
      }

      return repository.create(data);
    },

    async updateAuthor(id: string, input: unknown) {
      const validId = authorIdSchema.parse(id);
      const data: UpdateAuthorInput = updateAuthorSchema.parse(input);
      const currentAuthor = await repository.findById(validId);

      if (!currentAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      if (data.slug && data.slug !== currentAuthor.slug) {
        const slugExists = await repository.existsBySlug(data.slug, validId);

        if (slugExists) {
          throw new AuthorSlugConflictError(data.slug);
        }
      }

      const updatedAuthor = await repository.update(validId, data);

      if (!updatedAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      return updatedAuthor;
    },

    async archiveAuthor(id: string) {
      const validId = authorIdSchema.parse(id);
      const currentAuthor = await repository.findById(validId);

      if (!currentAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      if (currentAuthor.isArchived) {
        return currentAuthor;
      }

      const archivedAuthor = await repository.archive(validId);

      if (!archivedAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      return archivedAuthor;
    },

    async restoreAuthor(id: string) {
      const validId = authorIdSchema.parse(id);
      const currentAuthor = await repository.findById(validId);

      if (!currentAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      if (!currentAuthor.isArchived) {
        return currentAuthor;
      }

      const restoredAuthor = await repository.restore(validId);

      if (!restoredAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      return restoredAuthor;
    },
  };
}
