import { describe, expect, it } from 'vitest';

import {
  createAuthorTestimonialSchema,
  updateAuthorTestimonialSchema,
} from './author-testimonial.schema';

const authorId = '8a9dd9a7-a564-44f3-b65f-94f0390b6d75';
const bookId = '4250d083-874a-4095-ae82-77490910d9b1';

describe('author testimonial schemas', () => {
  it('accepts a testimonial without a book or rating', () => {
    const parsed = createAuthorTestimonialSchema.parse({
      authorId,
      quote: 'Una experiencia editorial muy cuidada y profesional.',
    });

    expect(parsed).toEqual({
      authorId,
      bookId: null,
      quote: 'Una experiencia editorial muy cuidada y profesional.',
      source: null,
      rating: null,
      isPublished: false,
      isFeatured: false,
      sortOrder: 0,
    });
  });

  it('accepts a testimonial with book, publication flags, sort order and rating', () => {
    const parsed = createAuthorTestimonialSchema.parse({
      authorId,
      bookId,
      quote: 'La edición de mi libro fue cercana, rigurosa y muy profesional.',
      source: 'manual',
      rating: 5,
      isPublished: true,
      isFeatured: true,
      sortOrder: 4,
    });

    expect(parsed).toMatchObject({
      bookId,
      source: 'manual',
      rating: 5,
      isPublished: true,
      isFeatured: true,
      sortOrder: 4,
    });
  });

  it('rejects missing author, short quote and invalid rating', () => {
    const parsed = createAuthorTestimonialSchema.safeParse({
      authorId: '',
      quote: 'Corto',
      rating: 6,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.authorId).toBeDefined();
      expect(parsed.error.flatten().fieldErrors.quote).toBeDefined();
      expect(parsed.error.flatten().fieldErrors.rating).toBeDefined();
    }
  });

  it('requires at least one field when updating', () => {
    const parsed = updateAuthorTestimonialSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });
});
