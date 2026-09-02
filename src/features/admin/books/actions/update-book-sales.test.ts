import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SalesMarketNotFoundError } from '@/services/sales/sales.errors';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireEditorialStaff: vi.fn(),
  updateBookSalesConfiguration: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/services/sales/sales.service', () => ({
  updateBookSalesConfiguration: mocks.updateBookSalesConfiguration,
}));

const { updateBookSalesAction } = await import('./update-book-sales');

const bookId = '820b7f59-4578-4d3e-a9ce-bc3edb9b4186';
const marketId = '97fe21b2-1f6c-4e29-ae02-e6d57d87c037';
const input = {
  quares: {
    enabled: true,
    externalProductId: '67778',
    status: 'available' as const,
    marketIds: [marketId],
  },
  amazon: {
    enabled: true,
    purchaseUrl: 'https://www.amazon.es/dp/example',
    status: 'available' as const,
  },
};

describe('updateBookSalesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.updateBookSalesConfiguration.mockResolvedValue(undefined);
  });

  it('requires editorial authorization before updating sales', async () => {
    await updateBookSalesAction(bookId, input);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.updateBookSalesConfiguration).toHaveBeenCalledWith(bookId, input);
  });

  it('does not swallow authorization failures', async () => {
    const authorizationError = new Error('NEXT_REDIRECT');
    mocks.requireEditorialStaff.mockRejectedValue(authorizationError);

    await expect(updateBookSalesAction(bookId, input)).rejects.toBe(authorizationError);
    expect(mocks.updateBookSalesConfiguration).not.toHaveBeenCalled();
  });

  it('returns field errors without invoking the service', async () => {
    const result = await updateBookSalesAction(bookId, {
      ...input,
      quares: { ...input.quares, externalProductId: '', marketIds: [] },
    });

    expect(result).toMatchObject({
      success: false,
      fieldErrors: {
        'quares.externalProductId': expect.any(String),
        'quares.marketIds': expect.any(String),
      },
    });
    expect(mocks.updateBookSalesConfiguration).not.toHaveBeenCalled();
  });

  it('maps manipulated market ids to the markets field', async () => {
    mocks.updateBookSalesConfiguration.mockRejectedValue(new SalesMarketNotFoundError());

    const result = await updateBookSalesAction(bookId, input);

    expect(result.fieldErrors['quares.marketIds']).toBe(
      'Uno de los mercados seleccionados no existe.',
    );
  });

  it('returns success and revalidates both book routes', async () => {
    const result = await updateBookSalesAction(bookId, input);

    expect(result).toEqual({ success: true, fieldErrors: {}, formError: null });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/books');
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/books/${bookId}`);
  });
});
