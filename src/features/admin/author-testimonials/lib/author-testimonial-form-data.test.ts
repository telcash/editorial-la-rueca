import { describe, expect, it } from 'vitest';

import {
  getAuthorTestimonialCreateInput,
  getAuthorTestimonialFormValues,
} from './author-testimonial-form-data';

const authorId = '8a9dd9a7-a564-44f3-b65f-94f0390b6d75';
const bookId = '4250d083-874a-4095-ae82-77490910d9b1';

describe('author testimonial form data', () => {
  it('converts FormData into service input', () => {
    const formData = new FormData();
    formData.set('authorId', authorId);
    formData.set('bookId', bookId);
    formData.set('quote', 'Una experiencia editorial muy cuidada.');
    formData.set('source', 'manual');
    formData.set('rating', '5');
    formData.set('isPublished', 'true');
    formData.set('isFeatured', 'true');
    formData.set('sortOrder', '3');

    expect(getAuthorTestimonialCreateInput(formData)).toEqual({
      authorId,
      bookId,
      quote: 'Una experiencia editorial muy cuidada.',
      source: 'manual',
      rating: 5,
      isPublished: true,
      isFeatured: true,
      sortOrder: 3,
    });
  });

  it('keeps optional book and rating empty when absent', () => {
    const formData = new FormData();
    formData.set('authorId', authorId);
    formData.set('quote', 'Una experiencia editorial muy cuidada.');
    formData.set('sortOrder', '');

    expect(getAuthorTestimonialCreateInput(formData)).toMatchObject({
      bookId: null,
      rating: null,
      isPublished: false,
      isFeatured: false,
      sortOrder: 0,
    });
  });

  it('preserves boolean form values for repopulating the form', () => {
    const formData = new FormData();
    formData.set('authorId', authorId);
    formData.set('quote', 'Una experiencia editorial muy cuidada.');
    formData.set('isPublished', 'true');

    expect(getAuthorTestimonialFormValues(formData)).toMatchObject({
      isPublished: true,
      isFeatured: false,
    });
  });
});
