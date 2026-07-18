import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookNotFoundError, BookSlugConflictError } from '@/services/books/book.errors';
import type { UpdateBookFormPayload } from '../lib/book-edition-form.helpers';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  requireEditorialStaff: vi.fn(),
  updateBook: vi.fn(),
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
  updateBook: mocks.updateBook,
}));

const { updateBookAction } = await import('./update-book');

const bookId = '7a7f6a8d-3c9c-4f5a-9a11-5ad4e5cfe001';
const payload: UpdateBookFormPayload = {
  title: 'El jardín revisado',
  subtitle: '',
  slug: 'el-jardin-revisado',
  description: '',
  excerpt: '',
  originalPublicationDate: '',
  language: 'es',
  isPublished: true,
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

describe('updateBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.updateBook.mockResolvedValue({});
  });

  it('validates access, updates the book, revalidates and redirects', async () => {
    await expect(updateBookAction(bookId, payload)).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.updateBook).toHaveBeenCalledWith(
      bookId,
      expect.objectContaining({
        title: 'El jardín revisado',
        slug: 'el-jardin-revisado',
        authorIds: ['550e8400-e29b-41d4-a716-446655440000'],
        editions: [expect.objectContaining({ price: '18.90' })],
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/books/${bookId}`);
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/books');
  });

  it('returns Zod path errors without calling the service', async () => {
    const state = await updateBookAction(bookId, {
      ...payload,
      slug: '',
    });

    expect(state.pathErrors.slug).toBeDefined();
    expect(mocks.updateBook).not.toHaveBeenCalled();
  });

  it('maps duplicate slugs to the slug field', async () => {
    mocks.updateBook.mockRejectedValueOnce(new BookSlugConflictError('el-jardin-revisado'));

    const state = await updateBookAction(bookId, payload);

    expect(state.pathErrors.slug).toBe('Ya existe otro libro con este slug.');
  });

  it('maps missing books to a safe form error', async () => {
    mocks.updateBook.mockRejectedValueOnce(new BookNotFoundError(bookId));

    const state = await updateBookAction(bookId, payload);

    expect(state.formError).toBe('Este libro ya no existe.');
  });

  it('rejects invalid ids before calling the service', async () => {
    const state = await updateBookAction('invalid-id', payload);

    expect(state.formError).toBe('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    expect(mocks.updateBook).not.toHaveBeenCalled();
  });
});
