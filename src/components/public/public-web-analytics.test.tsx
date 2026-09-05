import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCookieConsent: vi.fn(),
  analyticsProps: undefined as Record<string, unknown> | undefined,
}));

vi.mock('@vercel/analytics/next', () => ({
  Analytics: (props: Record<string, unknown>) => {
    mocks.analyticsProps = props;
    return <span data-testid="vercel-analytics" />;
  },
}));

vi.mock('./cookie-consent/cookie-consent-provider', () => ({
  useCookieConsent: mocks.useCookieConsent,
}));

const { PublicWebAnalytics } = await import('./public-web-analytics');

describe('PublicWebAnalytics', () => {
  beforeEach(() => {
    mocks.analyticsProps = undefined;
    mocks.useCookieConsent.mockReset();
  });

  it('does not render without analytics consent', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { analytics: false } });

    expect(renderToStaticMarkup(<PublicWebAnalytics enabledForProduction />)).not.toContain(
      'vercel-analytics',
    );
  });

  it('does not render outside the production deployment', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { analytics: true } });

    expect(renderToStaticMarkup(<PublicWebAnalytics enabledForProduction={false} />)).not.toContain(
      'vercel-analytics',
    );
  });

  it('renders automatic production analytics after consent', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { analytics: true } });

    expect(renderToStaticMarkup(<PublicWebAnalytics enabledForProduction />)).toContain(
      'vercel-analytics',
    );
    expect(mocks.analyticsProps).toMatchObject({ mode: 'production' });
    expect(mocks.analyticsProps).not.toHaveProperty('track');
    expect(mocks.analyticsProps).not.toHaveProperty('event');
    expect(mocks.analyticsProps).toHaveProperty('beforeSend');
  });

  it('stops rendering when consent is revoked', () => {
    mocks.useCookieConsent.mockReturnValue({ consent: { analytics: true } });

    expect(renderToStaticMarkup(<PublicWebAnalytics enabledForProduction />)).toContain(
      'vercel-analytics',
    );

    mocks.useCookieConsent.mockReturnValue({ consent: { analytics: false } });

    expect(renderToStaticMarkup(<PublicWebAnalytics enabledForProduction />)).not.toContain(
      'vercel-analytics',
    );
  });

  it('is mounted only by the public layout', () => {
    const publicLayout = readFileSync(join(process.cwd(), 'src/app/(public)/layout.tsx'), 'utf8');
    const adminLayout = readFileSync(
      join(process.cwd(), 'src/app/(admin)/admin/layout.tsx'),
      'utf8',
    );

    expect(publicLayout).toContain('PublicWebAnalytics');
    expect(publicLayout).toContain("process.env.VERCEL_ENV === 'production'");
    expect(adminLayout).not.toContain('PublicWebAnalytics');
  });
});
