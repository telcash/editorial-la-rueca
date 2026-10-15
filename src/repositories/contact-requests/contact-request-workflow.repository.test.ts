import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  statusWhere: vi.fn(),
  forShare: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  updateWhere: vi.fn(),
  updateReturning: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  insertReturning: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

const { transitionStatus } = await import('./contact-request-workflow.repository');

describe('contact request workflow repository status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ from: mocks.from });
    mocks.from.mockReturnValue({ where: mocks.statusWhere });
    mocks.statusWhere.mockReturnValue({ for: mocks.forShare });
    mocks.forShare.mockResolvedValue([{ key: 'no_answer' }]);
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockReturnValue({ returning: mocks.updateReturning });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ returning: mocks.insertReturning });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ select: mocks.select, update: mocks.update, insert: mocks.insert }),
    );
  });

  it('updates the state and inserts its audit entry in the same transaction', async () => {
    const event = { id: 'event-1', previousStatus: 'new', newStatus: 'no_answer' };
    mocks.updateReturning.mockResolvedValue([{ id: 'request-1' }]);
    mocks.insertReturning.mockResolvedValue([event]);

    await expect(
      transitionStatus({
        contactRequestId: 'request-1',
        previousStatus: 'new',
        newStatus: 'no_answer',
        changedByProfileId: 'profile-1',
      }),
    ).resolves.toEqual(event);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        contactRequestId: 'request-1',
        previousStatus: 'new',
        newStatus: 'no_answer',
        changedByProfileId: 'profile-1',
      }),
    );
  });

  it('does not insert an audit entry when the expected old state no longer matches', async () => {
    mocks.updateReturning.mockResolvedValue([]);

    await expect(
      transitionStatus({
        contactRequestId: 'request-1',
        previousStatus: 'new',
        newStatus: 'no_answer',
        changedByProfileId: 'profile-1',
      }),
    ).resolves.toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('does not update or log a transition to an inactive status', async () => {
    mocks.forShare.mockResolvedValue([]);

    await expect(
      transitionStatus({
        contactRequestId: 'request-1',
        previousStatus: 'new',
        newStatus: 'no_answer',
        changedByProfileId: 'profile-1',
      }),
    ).resolves.toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('propagates history insertion failures so the database transaction can roll back the state update', async () => {
    const insertError = new Error('history insert failed');
    mocks.updateReturning.mockResolvedValue([{ id: 'request-1' }]);
    mocks.insertReturning.mockRejectedValue(insertError);

    await expect(
      transitionStatus({
        contactRequestId: 'request-1',
        previousStatus: 'new',
        newStatus: 'no_answer',
        changedByProfileId: 'profile-1',
      }),
    ).rejects.toBe(insertError);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.insert).toHaveBeenCalledOnce();
  });
});
