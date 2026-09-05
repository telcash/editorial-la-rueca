import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPublicChannelMarkets: vi.fn(),
}));

vi.mock('@/services/sales/sales.service', () => ({
  getPublicChannelMarkets: mocks.getPublicChannelMarkets,
}));

vi.mock('@/features/public/sales/public-sales-markets', () => ({
  getPublicQuaresMarkets: () => mocks.getPublicChannelMarkets('quares'),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

const { PublicHeader } = await import('./public-header');

describe('PublicHeader store navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the Quares store navigation and exposes Tienda on desktop and mobile', async () => {
    mocks.getPublicChannelMarkets.mockResolvedValue([
      {
        name: 'España',
        countryCode: 'ES',
        baseUrl: 'https://tienda.editoriallarueca.com',
        sortOrder: 0,
      },
    ]);

    const html = renderToStaticMarkup(await PublicHeader());

    expect(mocks.getPublicChannelMarkets).toHaveBeenCalledWith('quares');
    expect(html).toContain('Tienda');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Amazon');
  });

  it('keeps the header functional and omits Tienda when the markets query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.getPublicChannelMarkets.mockRejectedValue(new Error('database unavailable'));

    const html = renderToStaticMarkup(await PublicHeader());

    expect(html).toContain('Navegación principal');
    expect(html).not.toContain('Tienda');
    expect(consoleError).toHaveBeenCalledWith(
      '[PublicHeader] Store markets query failed',
      expect.objectContaining({ message: 'database unavailable' }),
    );
    consoleError.mockRestore();
  });
});
