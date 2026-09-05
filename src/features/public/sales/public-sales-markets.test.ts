import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => {
  const unstableCache = vi.fn((callback: () => Promise<unknown>) => {
    let cachedResult: Promise<unknown> | undefined;

    return () => {
      cachedResult ??= callback();
      return cachedResult;
    };
  });

  return {
    getPublicChannelMarkets: vi.fn(),
    unstableCache,
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: mocks.unstableCache,
}));

vi.mock('@/services/sales/sales.service', () => ({
  getPublicChannelMarkets: mocks.getPublicChannelMarkets,
}));

const { getPublicQuaresMarkets } = await import('./public-sales-markets');

describe('getPublicQuaresMarkets', () => {
  beforeEach(() => {
    mocks.getPublicChannelMarkets.mockReset();
  });

  it('configures a one-hour tagged cache for public Quares markets', () => {
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ['public-sales-channel-markets', 'quares'],
      {
        revalidate: 3600,
        tags: ['public-sales-channel-markets:quares'],
      },
    );
  });

  it('reuses the cached result for repeated calls', async () => {
    const markets = [
      {
        name: 'España',
        countryCode: 'ES',
        baseUrl: 'https://tienda.editoriallarueca.com',
        sortOrder: 0,
      },
    ];
    mocks.getPublicChannelMarkets.mockResolvedValue(markets);

    await expect(getPublicQuaresMarkets()).resolves.toEqual(markets);
    await expect(getPublicQuaresMarkets()).resolves.toEqual(markets);

    expect(mocks.getPublicChannelMarkets).toHaveBeenCalledTimes(1);
    expect(mocks.getPublicChannelMarkets).toHaveBeenCalledWith('quares');
  });
});
