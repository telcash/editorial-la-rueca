import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  archiveBook: vi.fn(),
  restoreBook: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/books/book.service', () => ({
  archiveBook: mocks.archiveBook,
  restoreBook: mocks.restoreBook,
}));

const { archiveBookAction, restoreBookAction } = await import('./archive-book');

const bookId = '6b34dbd8-6d3c-41db-86b7-c83f3de68d75';

describe('book archive actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
  });

  it('archives a book and revalidates admin routes', async () => {
    await archiveBookAction(bookId);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.archiveBook).toHaveBeenCalledWith(bookId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/books/${bookId}`);
  });

  it('restores a book and revalidates admin routes', async () => {
    await restoreBookAction(bookId);

    expect(mocks.restoreBook).toHaveBeenCalledWith(bookId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/books/${bookId}`);
  });
});
