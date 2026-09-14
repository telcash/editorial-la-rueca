import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCookieConsent: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('./cookie-consent/cookie-consent-provider', () => ({
  useCookieConsent: mocks.useCookieConsent,
}));

const {
  PublicMetaPixel,
  getMetaPixelRouteKey,
  isValidMetaPixelId,
  shouldEnableMetaPixel,
  trackMetaEvent,
} = await import('./public-meta-pixel');

describe('PublicMetaPixel', () => {
  beforeEach(() => {
    mocks.useCookieConsent.mockReset();
    mocks.useCookieConsent.mockReturnValue({ consent: { marketing: false } });
  });

  it('does not render any tracking markup without marketing consent', () => {
    expect(renderToStaticMarkup(<PublicMetaPixel enabledForProduction />)).toBe('');
  });

  it('does not render any tracking markup outside production', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { marketing: true } });

    expect(renderToStaticMarkup(<PublicMetaPixel enabledForProduction={false} />)).toBe('');
  });

  it('allows initialization only with production, marketing consent, and a valid id', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { marketing: true } });

    expect(renderToStaticMarkup(<PublicMetaPixel enabledForProduction />)).toBe('');
    expect(shouldEnableMetaPixel(true, true, '1855729672084422')).toBe(true);
    expect(shouldEnableMetaPixel(false, true, '1855729672084422')).toBe(false);
    expect(shouldEnableMetaPixel(true, false, '1855729672084422')).toBe(false);
    expect(shouldEnableMetaPixel(true, true, undefined)).toBe(false);
  });

  it('validates configurable numeric pixel ids and builds stable route keys', () => {
    expect(isValidMetaPixelId('1855729672084422')).toBe(true);
    expect(isValidMetaPixelId('not-a-pixel')).toBe(false);
    expect(isValidMetaPixelId(undefined)).toBe(false);
    expect(getMetaPixelRouteKey('/libros')).toBe('/libros');
  });

  it('keeps the same PageView key for query-only changes', () => {
    const pathnameKey = getMetaPixelRouteKey('/libros');

    expect(getMetaPixelRouteKey('/libros')).toBe(pathnameKey);
    expect(getMetaPixelRouteKey('/libros')).toBe(getMetaPixelRouteKey('/libros'));
    expect(getMetaPixelRouteKey('/')).toBe('/');
    expect(getMetaPixelRouteKey('/libros')).not.toBe(getMetaPixelRouteKey('/autores'));
  });

  it('exposes only the standard Lead event for a ready Meta Pixel', () => {
    expect(trackMetaEvent('Lead')).toBe(false);
  });

  it('is included only in the public layout', () => {
    const publicLayout = readFileSync(join(process.cwd(), 'src/app/(public)/layout.tsx'), 'utf8');
    const adminLayout = readFileSync(
      join(process.cwd(), 'src/app/(admin)/admin/layout.tsx'),
      'utf8',
    );

    expect(publicLayout).toContain('PublicMetaPixel');
    expect(publicLayout).toContain("process.env.VERCEL_ENV === 'production'");
    expect(adminLayout).not.toContain('PublicMetaPixel');
  });
});
