import { describe, expect, it } from 'vitest';

import { BOOK_COVER_MAX_SIZE_BYTES } from '../services/book-cover-constants';
import type { CreateBookFormPayload } from './book-edition-form.helpers';
import {
  createBookActionFormData,
  formatBookCoverFileSize,
  getBookCoverFileFromFormData,
  getBookPayloadFromFormData,
  getRemoveExistingCoverFromFormData,
  isBookCoverDirty,
  updateBookActionFormData,
  validateBookCoverClientFile,
} from './book-cover-form.helpers';

const payload: CreateBookFormPayload = {
  title: 'Libro',
  subtitle: '',
  slug: 'libro',
  description: '',
  excerpt: '',
  originalPublicationDate: '',
  language: 'es',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  authorIds: ['550e8400-e29b-41d4-a716-446655440000'],
  categoryIds: [],
  editions: [
    {
      format: 'paperback',
      editionLabel: '',
      publicationDate: '',
      isbn10: '',
      isbn13: '',
      price: '',
      currency: 'EUR',
      pages: '',
      isAvailable: true,
      isFeatured: false,
      sortOrder: '0',
    },
  ],
};

function createImageFile(type: string, size = 1024) {
  return new File([new Uint8Array(size)], 'cover', { type });
}

describe('book cover form helpers', () => {
  it('validates client files without trusting accept', () => {
    expect(validateBookCoverClientFile(createImageFile('image/jpeg'))).toBeNull();
    expect(validateBookCoverClientFile(createImageFile('image/png'))).toBeNull();
    expect(validateBookCoverClientFile(createImageFile('image/webp'))).toBeNull();
    expect(validateBookCoverClientFile(createImageFile('image/gif'))).toBe(
      'Formato no permitido. Usa JPG, PNG o WebP.',
    );
    expect(
      validateBookCoverClientFile(createImageFile('image/jpeg', BOOK_COVER_MAX_SIZE_BYTES + 1)),
    ).toBe('La imagen no puede superar los 5 MB.');
  });

  it('formats file size labels', () => {
    expect(formatBookCoverFileSize(1024)).toBe('1 KB');
    expect(formatBookCoverFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('detects dirty state for new and removed covers', () => {
    expect(isBookCoverDirty({ selectedFile: null, removeExistingCover: false })).toBe(false);
    expect(
      isBookCoverDirty({ selectedFile: createImageFile('image/jpeg'), removeExistingCover: false }),
    ).toBe(true);
    expect(isBookCoverDirty({ selectedFile: null, removeExistingCover: true })).toBe(true);
  });

  it('builds and reads create FormData with optional cover', () => {
    const cover = createImageFile('image/jpeg');
    const formData = createBookActionFormData(payload, cover);

    expect(getBookPayloadFromFormData<CreateBookFormPayload>(formData)).toEqual(payload);
    expect(getBookCoverFileFromFormData(formData)).toBe(cover);
  });

  it('builds and reads update FormData without cover and with remove state', () => {
    const formData = updateBookActionFormData(payload, null, true);

    expect(getBookPayloadFromFormData<CreateBookFormPayload>(formData)).toEqual(payload);
    expect(getBookCoverFileFromFormData(formData)).toBeNull();
    expect(getRemoveExistingCoverFromFormData(formData)).toBe(true);
  });
});
