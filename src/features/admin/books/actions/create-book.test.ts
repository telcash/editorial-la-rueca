import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookSlugConflictError } from '@/services/books/book.errors';
import { createBookActionFormData } from '../lib/book-cover-form.helpers';
import type { CreateBookFormPayload } from '../lib/book-edition-form.helpers';
import { BookCoverDeleteError, BookCoverUploadError } from '../services/book-cover-errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  requireEditorialStaff: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
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
  createBook: mocks.createBook,
  updateBook: mocks.updateBook,
}));

vi.mock('../services/book-cover-service', () => ({
  uploadBookCover: mocks.uploadBookCover,
  deleteBookCover: mocks.deleteBookCover,
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
  categoryIds: [],
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
const createdBook = {
  id: '7a7f6a8d-3c9c-4f5a-9a11-5ad4e5cfe001',
};

function createImageFile(type = 'image/jpeg', size = 1024) {
  return new File([new Uint8Array(size)], 'cover', { type });
}

describe('createBookAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.createBook.mockResolvedValue(createdBook);
    mocks.updateBook.mockResolvedValue({});
    mocks.uploadBookCover.mockResolvedValue({
      path: `${createdBook.id}/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.jpg`,
      publicUrl: 'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });
    mocks.deleteBookCover.mockResolvedValue(undefined);
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
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/books?feedback=bookCreated');
  });

  it('creates the book, uploads a cover and persists its public URL', async () => {
    await expect(
      createBookAction(createBookActionFormData(payload, createImageFile())),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createBook).toHaveBeenCalledOnce();
    expect(mocks.uploadBookCover).toHaveBeenCalledWith(createdBook.id, expect.any(File));
    expect(mocks.updateBook).toHaveBeenCalledWith(createdBook.id, {
      coverUrl: 'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
    });
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/books?feedback=bookCreated');
  });

  it('returns a cover field error for invalid files before creating', async () => {
    const state = await createBookAction(
      createBookActionFormData(payload, createImageFile('image/gif')),
    );

    expect(state.pathErrors.cover).toBe('Formato no permitido. Usa JPG, PNG o WebP.');
    expect(mocks.createBook).not.toHaveBeenCalled();
  });

  it('redirects to edit when cover upload fails after creating the book', async () => {
    mocks.uploadBookCover.mockRejectedValueOnce(new BookCoverUploadError());

    await expect(
      createBookAction(createBookActionFormData(payload, createImageFile())),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createBook).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/admin/books/${createdBook.id}?coverUpload=failed`,
    );
  });

  it('does not try to create the book a second time when cover upload fails', async () => {
    mocks.uploadBookCover.mockRejectedValueOnce(new BookCoverUploadError());

    await expect(
      createBookAction(createBookActionFormData(payload, createImageFile())),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.createBook).toHaveBeenCalledTimes(1);
  });

  it('deletes the new cover and redirects to edit when persisting its URL fails', async () => {
    mocks.updateBook.mockRejectedValueOnce(new Error('database error'));

    await expect(
      createBookAction(createBookActionFormData(payload, createImageFile())),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.deleteBookCover).toHaveBeenCalledWith(
      'https://project.supabase.co/storage/v1/object/public/book-covers/new.jpg',
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/admin/books/${createdBook.id}?coverUpload=failed`,
    );
  });

  it('redirects to edit when cleanup also fails after cover URL persistence fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.updateBook.mockRejectedValueOnce(new Error('database error'));
    mocks.deleteBookCover.mockRejectedValueOnce(new BookCoverDeleteError());

    await expect(
      createBookAction(createBookActionFormData(payload, createImageFile())),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[BookCoverService] Cleanup after cover persistence failure failed',
      expect.objectContaining({
        bookId: createdBook.id,
      }),
    );

    consoleErrorSpy.mockRestore();
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
