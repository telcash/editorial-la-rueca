import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookSlugConflictError } from '@/services/books/book.errors';
import type { CreateBookFormPayload } from '../lib/book-edition-form.helpers';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  requireEditorialStaff: vi.fn(),
  createBook: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/books/book.service', () => ({
  createBook: mocks.createBook,
}));

const { createBookAction } = await import('./create-book');

const payload: CreateBookFormPayload = {
  title: 'El jardín perdido',
  subtitle: '',
  slug: 'el-jardin-perdido',
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
  editions: [
    {
      format: 'paperback',
      editionLabel: '',
      publicationDate: '',
      isbn10: '',
      isbn13: '',
      price: '18,90',
      currency: 'EUR',
      pages: '',
      isAvailable: true,
      isFeatured: false,
      sortOrder: '0',
    },
  ],
};

describe('createBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.createBook.mockResolvedValue({});
  });

  it('validates access, creates the book, revalidates and redirects', async () => {
    await expect(createBookAction(payload)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'El jardín perdido',
        slug: 'el-jardin-perdido',
        authorIds: ['550e8400-e29b-41d4-a716-446655440000'],
        editions: [expect.objectContaining({ price: '18.90' })],
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/books');
  });

  it('returns Zod path errors without calling the service', async () => {
    const state = await createBookAction({
      ...payload,
      title: '',
    });

    expect(state.pathErrors.title).toBeDefined();
    expect(mocks.createBook).not.toHaveBeenCalled();
  });

  it('maps domain errors without exposing internal details', async () => {
    mocks.createBook.mockRejectedValueOnce(new BookSlugConflictError('el-jardin-perdido'));

    const state = await createBookAction(payload);

    expect(state.pathErrors.slug).toBe('Ya existe un libro con este slug.');
  });
});
