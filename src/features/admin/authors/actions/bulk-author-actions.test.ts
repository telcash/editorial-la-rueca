import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  bulkUpdateAuthors: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/authors/author.service', () => ({
  bulkUpdateAuthors: mocks.bulkUpdateAuthors,
}));

const { bulkUpdateAuthorsAction } = await import('./bulk-author-actions');

const authorId = '550e8400-e29b-41d4-a716-446655440000';

describe('bulkUpdateAuthorsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.bulkUpdateAuthors.mockResolvedValue({ requested: 1, updated: 1, skipped: 0, errors: 0 });
  });

  it('requires editorial staff before running batch updates', async () => {
    await bulkUpdateAuthorsAction([authorId], 'restore');

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.bulkUpdateAuthors).toHaveBeenCalledWith([authorId], 'restore');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/authors');
  });

  it('does not expose a bulk permanent delete action', async () => {
    await expect(bulkUpdateAuthorsAction([authorId], 'delete' as never)).rejects.toThrow();
  });
});
