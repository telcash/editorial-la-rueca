import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookNotFoundError, BookSlugConflictError } from '@/services/books/book.errors';
import { updateBookActionFormData } from '../lib/book-cover-form.helpers';
import type { UpdateBookFormPayload } from '../lib/book-edition-form.helpers';
import { BookCoverDeleteError, BookCoverUploadError } from '../services/book-cover-errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  requireEditorialStaff: vi.fn(),
  updateBook: vi.fn(),
  getBookById: vi.fn(),
  uploadBookCover: vi.fn(),
  deleteBookCover: vi.fn(),
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
  getBookById: mocks.getBookById,
}));

vi.mock('../services/book-cover-service', () => ({
  uploadBookCover: mocks.uploadBookCover,
  deleteBookCover: mocks.deleteBookCover,
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
const previousCoverUrl = `https://project.supabase.co/storage/v1/object/public/book-covers/${bookId}/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.jpg`;

function createImageFile(type = 'image/jpeg', size = 1024) {
  return new File([new Uint8Array(size)], 'cover', { type });
}

describe('updateBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.updateBook.mockResolvedValue({});
    mocks.getBookById.mockResolvedValue({
      id: bookId,
      coverUrl: previousCoverUrl,
    });
    mocks.uploadBookCover.mockResolvedValue({
      path: `${bookId}/7c2f3a5b-1a8e-4f7d-9b2c-6a1e5d4f8c9b.jpg`,
      publicUrl: 'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    mocks.deleteBookCover.mockResolvedValue(undefined);
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

  it('updates the book and uploads a new cover before deleting the previous one', async () => {
    await expect(
      updateBookAction(bookId, updateBookActionFormData(payload, createImageFile(), false)),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.updateBook).toHaveBeenNthCalledWith(
      1,
      bookId,
      expect.objectContaining({ title: 'El jardín revisado' }),
    );
    expect(mocks.uploadBookCover).toHaveBeenCalledWith(bookId, expect.any(File));
    expect(mocks.updateBook).toHaveBeenNthCalledWith(2, bookId, {
      coverUrl: 'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
    });
    expect(mocks.deleteBookCover).toHaveBeenCalledWith(previousCoverUrl);
  });

  it('removes the active cover only after setting coverUrl to null', async () => {
    await expect(
      updateBookAction(bookId, updateBookActionFormData(payload, null, true)),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.updateBook).toHaveBeenNthCalledWith(2, bookId, {
      coverUrl: null,
    });
    expect(mocks.deleteBookCover).toHaveBeenCalledWith(previousCoverUrl);
  });

  it('does not delete the previous cover when upload fails', async () => {
    mocks.uploadBookCover.mockRejectedValueOnce(new BookCoverUploadError());

    const state = await updateBookAction(
      bookId,
      updateBookActionFormData(payload, createImageFile(), false),
    );

    expect(state.formError).toBe('No se pudo actualizar la portada. Inténtalo de nuevo.');
    expect(mocks.deleteBookCover).not.toHaveBeenCalled();
  });

  it('keeps the new cover when deleting the previous cover fails', async () => {
    mocks.deleteBookCover.mockRejectedValueOnce(new BookCoverDeleteError());

    await expect(
      updateBookAction(bookId, updateBookActionFormData(payload, createImageFile(), false)),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.updateBook).toHaveBeenNthCalledWith(2, bookId, {
      coverUrl: 'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/books');
  });

  it('deletes the new cover and keeps the previous one when persisting the new URL fails', async () => {
    mocks.updateBook.mockResolvedValueOnce({});
    mocks.updateBook.mockRejectedValueOnce(new Error('database error'));

    const state = await updateBookAction(
      bookId,
      updateBookActionFormData(payload, createImageFile(), false),
    );

    expect(state.formError).toBe('No se pudo actualizar la portada. Inténtalo de nuevo.');
    expect(mocks.deleteBookCover).toHaveBeenCalledTimes(1);
    expect(mocks.deleteBookCover).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
    );
    expect(mocks.deleteBookCover).not.toHaveBeenCalledWith(previousCoverUrl);
  });

  it('keeps the persistence error when cleanup of the new cover also fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.updateBook.mockResolvedValueOnce({});
    mocks.updateBook.mockRejectedValueOnce(new Error('database error'));
    mocks.deleteBookCover.mockRejectedValueOnce(new BookCoverDeleteError());

    const state = await updateBookAction(
      bookId,
      updateBookActionFormData(payload, createImageFile(), false),
    );

    expect(state.formError).toBe('No se pudo actualizar la portada. Inténtalo de nuevo.');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BookCoverService] Cleanup after cover persistence failure failed',
      expect.objectContaining({
        bookId,
      }),
    );

    consoleErrorSpy.mockRestore();
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
