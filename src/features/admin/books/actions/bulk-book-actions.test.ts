import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  bulkUpdateBooks: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/books/book.service', () => ({
  bulkUpdateBooks: mocks.bulkUpdateBooks,
}));

const { bulkUpdateBooksAction } = await import('./bulk-book-actions');

const bookId = '6b34dbd8-6d3c-41db-86b7-c83f3de68d75';

describe('bulkUpdateBooksAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.bulkUpdateBooks.mockResolvedValue({ requested: 1, updated: 1, skipped: 0, errors: 0 });
  });

  it('requires editorial staff before running batch updates', async () => {
    await bulkUpdateBooksAction([bookId], 'archive');

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.bulkUpdateBooks).toHaveBeenCalledWith([bookId], 'archive');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
  });

  it('does not expose a bulk permanent delete action', async () => {
    await expect(bulkUpdateBooksAction([bookId], 'delete' as never)).rejects.toThrow();
  });
});
