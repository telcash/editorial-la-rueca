import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BookMustBeArchivedError } from '@/services/books/book.errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  deleteBookPermanently: vi.fn(),
  deleteBookCover: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/services/books/book.service', () => ({
  deleteBookPermanently: mocks.deleteBookPermanently,
}));

vi.mock('../services/book-cover-service', () => ({
  deleteBookCover: mocks.deleteBookCover,
}));

const { deleteBookPermanentlyAction } = await import('./delete-book-permanently');

const bookId = '6b34dbd8-6d3c-41db-86b7-c83f3de68d75';
const coverUrl =
  'https://project.supabase.co/storage/v1/object/public/book-covers/6b34dbd8-6d3c-41db-86b7-c83f3de68d75/1d2e4f8a-2a8a-42b9-8d1f-9c8a1f4c7b61.webp';

describe('deleteBookPermanentlyAction', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
    mocks.deleteBookPermanently.mockResolvedValue({
      id: bookId,
      coverUrl: null,
    });
    mocks.deleteBookCover.mockResolvedValue(undefined);
  });

  it('rejects callers that are not admins before deleting', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('unauthorized'));

    await expect(deleteBookPermanentlyAction(bookId, 'ELIMINAR')).rejects.toThrow('unauthorized');
    expect(mocks.deleteBookPermanently).not.toHaveBeenCalled();
  });

  it('rejects an incorrect confirmation', async () => {
    const result = await deleteBookPermanentlyAction(bookId, 'eliminar');

    expect(result).toEqual({
      success: false,
      message: 'Escribe ELIMINAR para confirmar la eliminación.',
    });
    expect(mocks.deleteBookPermanently).not.toHaveBeenCalled();
  });

  it('deletes as admin and revalidates books', async () => {
    const result = await deleteBookPermanentlyAction(bookId, 'ELIMINAR');

    expect(result).toEqual({ success: true, message: null });
    expect(mocks.deleteBookPermanently).toHaveBeenCalledWith(bookId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
  });

  it('cleans up the cover URL returned by the server after the database delete', async () => {
    mocks.deleteBookPermanently.mockResolvedValue({
      id: bookId,
      coverUrl,
    });

    await deleteBookPermanentlyAction(bookId, 'ELIMINAR');

    expect(mocks.deleteBookCover).toHaveBeenCalledWith(coverUrl);
  });

  it('does not fail the delete when cover cleanup fails', async () => {
    mocks.deleteBookPermanently.mockResolvedValue({
      id: bookId,
      coverUrl,
    });
    mocks.deleteBookCover.mockRejectedValue(new Error('storage failed'));

    await expect(deleteBookPermanentlyAction(bookId, 'ELIMINAR')).resolves.toEqual({
      success: true,
      message: null,
    });
  });

  it('maps active books to a safe message', async () => {
    mocks.deleteBookPermanently.mockRejectedValue(new BookMustBeArchivedError());

    await expect(deleteBookPermanentlyAction(bookId, 'ELIMINAR')).resolves.toEqual({
      success: false,
      message: 'Archiva el libro antes de eliminarlo definitivamente.',
    });
  });
});
