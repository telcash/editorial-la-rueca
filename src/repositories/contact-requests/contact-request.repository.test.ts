import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    delete: mocks.delete,
  },
}));

const { deleteById } = await import('./contact-request.repository');

const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

describe('contact request repository delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delete.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
  });

  it('deletes only the requested id and returns the deleted row', async () => {
    const deleted = { id: contactRequestId };
    mocks.returning.mockResolvedValue([deleted]);

    await expect(deleteById(contactRequestId)).resolves.toEqual(deleted);
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledOnce();
    expect(mocks.returning).toHaveBeenCalledOnce();
  });

  it('returns null when no row matches the id', async () => {
    mocks.returning.mockResolvedValue([]);

    await expect(deleteById(contactRequestId)).resolves.toBeNull();
  });
});
