import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  archiveAuthor: vi.fn(),
  restoreAuthor: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/authors/author.service', () => ({
  archiveAuthor: mocks.archiveAuthor,
  restoreAuthor: mocks.restoreAuthor,
}));

const { archiveAuthorAction, restoreAuthorAction } = await import('./archive-author');

const authorId = '550e8400-e29b-41d4-a716-446655440000';

describe('author archive actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
  });

  it('archives an author and revalidates admin routes', async () => {
    await archiveAuthorAction(authorId);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.archiveAuthor).toHaveBeenCalledWith(authorId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/authors');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/authors/${authorId}`);
  });

  it('restores an author and revalidates admin routes', async () => {
    await restoreAuthorAction(authorId);

    expect(mocks.restoreAuthor).toHaveBeenCalledWith(authorId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/authors');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/authors/${authorId}`);
  });
});
