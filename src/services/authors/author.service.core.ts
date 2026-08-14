import { z } from 'zod';

import {
  createAuthorSchema,
  updateAuthorSchema,
  type CreateAuthorInput,
  type UpdateAuthorInput,
} from '@/schemas/authors/author.schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import {
  AuthorHasBooksError,
  AuthorMustBeArchivedError,
  AuthorNotFoundError,
  AuthorSlugConflictError,
} from './author.errors';
import type { AuthorRepository } from './author-service.types';

const authorIdSchema = z.string().uuid('El id del autor debe ser un UUID valido.');
const authorSlugSchema = createAuthorSchema.shape.slug;
const authorBulkActionSchema = z.enum([
  'publish',
  'unpublish',
  'feature',
  'unfeature',
  'archive',
  'restore',
]);

function isForeignKeyViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23503'
  );
}

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

    async listAuthorsForAdmin(status: ArchiveStatus = 'active') {
      return repository.findAllWithBookCount(status);
    },

    async listAuthorsForAdminPaginated(
      status: ArchiveStatus = 'active',
      options: Parameters<AuthorRepository['findAllWithBookCountPaginated']>[1],
    ) {
      return repository.findAllWithBookCountPaginated(status, options);
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

    async listPublishedAuthorsPaginated(
      options: Parameters<AuthorRepository['findPublishedPaginated']>[0],
    ) {
      return repository.findPublishedPaginated(options);
    },

    async getPublishedAuthorBySlug(slug: string) {
      const validSlug = authorSlugSchema.parse(slug);
      const author = await repository.findPublishedBySlug(validSlug);

      if (!author) {
        throw new AuthorNotFoundError(validSlug);
      }

      return author;
    },

    async listBooksByAuthorId(id: string) {
      const validId = authorIdSchema.parse(id);

      return repository.findBooksByAuthorId(validId);
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

    async bulkUpdateAuthors(ids: string[], action: unknown) {
      const validIds = ids.map((id) => authorIdSchema.parse(id));
      const validAction = authorBulkActionSchema.parse(action);

      return repository.bulkUpdate(validIds, validAction);
    },

    async deleteAuthorPermanently(id: string) {
      const validId = authorIdSchema.parse(id);
      const currentAuthor = await repository.findById(validId);

      if (!currentAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      if (!currentAuthor.isArchived) {
        throw new AuthorMustBeArchivedError();
      }

      const bookCount = await repository.countBooksByAuthorId(validId);

      if (bookCount > 0) {
        throw new AuthorHasBooksError(bookCount);
      }

      let deletedAuthor: Awaited<ReturnType<AuthorRepository['deleteById']>>;

      try {
        deletedAuthor = await repository.deleteById(validId);
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new AuthorHasBooksError(1);
        }

        throw error;
      }

      if (!deletedAuthor) {
        throw new AuthorNotFoundError(validId);
      }

      return deletedAuthor;
    },
  };
}
