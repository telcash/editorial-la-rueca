import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  leftJoin: vi.fn(),
  innerJoin: vi.fn(),
  values: vi.fn(),
  onConflictDoNothing: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    delete: mocks.delete,
    insert: mocks.insert,
    select: mocks.select,
  },
}));

const { create, deleteById, getCounts } = await import('./contact-request.repository');

const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

describe('contact request repository delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflictDoNothing });
    mocks.onConflictDoNothing.mockReturnValue({ returning: mocks.returning });
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ leftJoin: mocks.leftJoin, innerJoin: mocks.innerJoin });
    mocks.leftJoin.mockReturnValue({ where: mocks.where });
    mocks.innerJoin.mockReturnValue({ where: mocks.where });
    mocks.delete.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
  });

  it('inserts atomically against meta_lead_id and distinguishes created rows', async () => {
    const row = { id: contactRequestId, metaLeadId: 'meta-lead-1' };
    mocks.returning.mockResolvedValue([row]);

    await expect(
      create({
        name: 'Ana',
        email: 'ana@example.com',
        message: 'Solicitud Meta válida.',
        source: 'meta_instant_form',
        metaLeadId: 'meta-lead-1',
      }),
    ).resolves.toEqual({ status: 'created', contactRequest: row });
    expect(mocks.onConflictDoNothing).toHaveBeenCalledWith({
      target: expect.objectContaining({ name: 'meta_lead_id' }),
    });
  });

  it('distinguishes a unique-key duplicate without creating another row', async () => {
    mocks.returning.mockResolvedValue([]);

    await expect(
      create({
        name: 'Ana',
        email: 'ana@example.com',
        message: 'Solicitud Meta válida.',
        source: 'meta_instant_form',
        metaLeadId: 'meta-lead-1',
      }),
    ).resolves.toEqual({ status: 'duplicate', contactRequest: null });
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

  it('counts assigned and unassigned requests while preserving status aggregates', async () => {
    mocks.where.mockResolvedValue([{ total: 2, new: 1, inProgress: 0, won: 1 }]);

    await expect(getCounts()).resolves.toEqual({ total: 2, new: 1, inProgress: 0, won: 1 });
    expect(mocks.leftJoin).toHaveBeenCalledOnce();
    expect(mocks.leftJoin).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
      expect.anything(),
    );
    expect(mocks.innerJoin).not.toHaveBeenCalled();
  });

  it('keeps existing service filters on contact_requests with nullable service ids', async () => {
    mocks.where.mockResolvedValue([{ total: 1, new: 1, inProgress: 0, won: 0 }]);
    const filters = { serviceId: 'd6a41fed-40bd-4c09-8539-a0e278103a19' };

    await expect(getCounts(filters)).resolves.toEqual({
      total: 1,
      new: 1,
      inProgress: 0,
      won: 0,
    });
    expect(mocks.leftJoin).toHaveBeenCalledOnce();
    expect(mocks.where).toHaveBeenCalledWith(expect.anything());
  });
});
