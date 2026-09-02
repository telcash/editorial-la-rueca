import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BookSalesConfigurationPersistenceInput } from '@/services/sales/sales.types';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/db', () => ({
  db: {
    transaction: mocks.transaction,
  },
}));

const { saveBookSalesConfiguration } = await import('./sales.repository');

const bookId = '820b7f59-4578-4d3e-a9ce-bc3edb9b4186';
const quaresChannelId = 'be428823-9f04-4fe1-9303-a41e5ef9d04e';
const amazonChannelId = 'bd67695b-4c3d-4c31-9a62-c64a0f0bf4f9';
const marketId = '97fe21b2-1f6c-4e29-ae02-e6d57d87c037';

const enabledConfiguration: BookSalesConfigurationPersistenceInput = {
  bookId,
  quares: {
    channelId: quaresChannelId,
    enabled: true,
    status: 'available',
    externalProductId: '67778',
    purchaseUrl: null,
    marketIds: [marketId],
  },
  amazon: {
    channelId: amazonChannelId,
    enabled: true,
    status: 'available',
    externalProductId: null,
    purchaseUrl: 'https://www.amazon.es/dp/example',
    marketIds: [],
  },
};

function createTransactionMock(
  options: { failAvailabilityInsert?: boolean; hasAvailabilityInsert?: boolean } = {},
) {
  let insertCall = 0;
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const deleteFrom = vi.fn(() => ({ where: deleteWhere }));
  const productReturning = vi
    .fn()
    .mockResolvedValueOnce([{ id: 'e61c3616-c4f5-4f31-a0d3-4941edb5a66d' }])
    .mockResolvedValueOnce([{ id: 'f8e4e4ef-221c-4931-ae5b-cd84706050de' }]);
  const onConflictDoUpdate = vi.fn(() => ({ returning: productReturning }));
  const onConflictDoNothing = options.failAvailabilityInsert
    ? vi.fn().mockRejectedValue(new Error('availability insert failed'))
    : vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({
    values: vi.fn(() => {
      insertCall += 1;

      return options.hasAvailabilityInsert !== false && insertCall === 2
        ? { onConflictDoNothing }
        : { onConflictDoUpdate };
    }),
  }));

  return {
    transaction: { update, delete: deleteFrom, insert },
    update,
    updateSet,
    deleteFrom,
    insert,
    onConflictDoUpdate,
    onConflictDoNothing,
  };
}

describe('saveBookSalesConfiguration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts both products and synchronizes selected Quares markets in one transaction', async () => {
    const transaction = createTransactionMock();
    mocks.transaction.mockImplementation(async (callback) => callback(transaction.transaction));

    await saveBookSalesConfiguration(enabledConfiguration);

    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(transaction.onConflictDoUpdate).toHaveBeenCalledTimes(2);
    expect(transaction.deleteFrom).toHaveBeenCalledOnce();
    expect(transaction.onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it('deactivates existing products without deleting products or availability', async () => {
    const transaction = createTransactionMock();
    mocks.transaction.mockImplementation(async (callback) => callback(transaction.transaction));

    await saveBookSalesConfiguration({
      ...enabledConfiguration,
      quares: { ...enabledConfiguration.quares, enabled: false },
      amazon: { ...enabledConfiguration.amazon, enabled: false },
    });

    expect(transaction.update).toHaveBeenCalledTimes(2);
    expect(transaction.updateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ isActive: false }),
    );
    expect(transaction.insert).not.toHaveBeenCalled();
    expect(transaction.deleteFrom).not.toHaveBeenCalled();
  });

  it('removes all availability when an enabled Quares product has no selected markets', async () => {
    const transaction = createTransactionMock({ hasAvailabilityInsert: false });
    mocks.transaction.mockImplementation(async (callback) => callback(transaction.transaction));

    await saveBookSalesConfiguration({
      ...enabledConfiguration,
      quares: {
        ...enabledConfiguration.quares,
        status: 'pending',
        marketIds: [],
      },
    });

    expect(transaction.deleteFrom).toHaveBeenCalledOnce();
    expect(transaction.onConflictDoNothing).not.toHaveBeenCalled();
  });

  it('rejects the transaction when availability synchronization fails', async () => {
    const transaction = createTransactionMock({ failAvailabilityInsert: true });
    mocks.transaction.mockImplementation(async (callback) => callback(transaction.transaction));

    await expect(saveBookSalesConfiguration(enabledConfiguration)).rejects.toThrow(
      'availability insert failed',
    );
    expect(transaction.onConflictDoUpdate).toHaveBeenCalledOnce();
  });
});
