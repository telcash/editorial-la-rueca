import { z } from 'zod';

import {
  createAuthorTestimonialSchema,
  updateAuthorTestimonialSchema,
  type CreateAuthorTestimonialInput,
  type UpdateAuthorTestimonialInput,
} from '@/schemas/author-testimonials/author-testimonial.schema';
import {
  AuthorTestimonialAuthorNotFoundError,
  AuthorTestimonialBookNotFoundError,
  AuthorTestimonialNotFoundError,
} from './author-testimonial.errors';
import type {
  AuthorReferenceRepository,
  AuthorTestimonialRepository,
  BookReferenceRepository,
} from './author-testimonial.types';

const testimonialIdSchema = z.string().uuid('El id del testimonio debe ser un UUID válido.');
const authorIdSchema = z.string().uuid('El id del autor debe ser un UUID válido.');

export function createAuthorTestimonialService(
  repository: AuthorTestimonialRepository,
  authorRepository: AuthorReferenceRepository,
  bookRepository: BookReferenceRepository,
) {
  async function assertAuthorExists(authorId: string) {
    const author = await authorRepository.findById(authorId);

    if (!author) {
      throw new AuthorTestimonialAuthorNotFoundError(authorId);
    }
  }

  async function assertBookExists(bookId: string | null | undefined) {
    if (!bookId) {
      return;
    }

    const book = await bookRepository.findById(bookId);

    if (!book) {
      throw new AuthorTestimonialBookNotFoundError(bookId);
    }
  }

  return {
    async getTestimonialById(id: string) {
      const validId = testimonialIdSchema.parse(id);
      const testimonial = await repository.findById(validId);

      if (!testimonial) {
        throw new AuthorTestimonialNotFoundError(validId);
      }

      return testimonial;
    },

    async listTestimonials() {
      return repository.findAll();
    },

    async listPublishedTestimonials() {
      return repository.findPublished();
    },

    async listFeaturedPublishedTestimonials() {
      return repository.findFeaturedPublished();
    },

    async listTestimonialsByAuthorId(authorId: string) {
      const validAuthorId = authorIdSchema.parse(authorId);

      return repository.findByAuthorId(validAuthorId);
    },

    async createTestimonial(input: unknown) {
      const data: CreateAuthorTestimonialInput = createAuthorTestimonialSchema.parse(input);

      await assertAuthorExists(data.authorId);
      await assertBookExists(data.bookId);

      return repository.create(data);
    },

    async updateTestimonial(id: string, input: unknown) {
      const validId = testimonialIdSchema.parse(id);
      const data: UpdateAuthorTestimonialInput = updateAuthorTestimonialSchema.parse(input);
      const currentTestimonial = await repository.findById(validId);

      if (!currentTestimonial) {
        throw new AuthorTestimonialNotFoundError(validId);
      }

      if (data.authorId !== undefined) {
        await assertAuthorExists(data.authorId);
      }

      if (data.bookId !== undefined) {
        await assertBookExists(data.bookId);
      }

      const updatedTestimonial = await repository.update(validId, data);

      if (!updatedTestimonial) {
        throw new AuthorTestimonialNotFoundError(validId);
      }

      return updatedTestimonial;
    },

    async deleteTestimonial(id: string) {
      const validId = testimonialIdSchema.parse(id);
      const deletedTestimonial = await repository.deleteById(validId);

      if (!deletedTestimonial) {
        throw new AuthorTestimonialNotFoundError(validId);
      }

      return deletedTestimonial;
    },
  };
}
