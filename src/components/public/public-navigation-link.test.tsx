import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const routing = vi.hoisted(() => ({ pathname: '/' as string | null }));

vi.mock('next/navigation', () => ({ usePathname: () => routing.pathname }));

import { publicNavigation } from './public-navigation';
import { PublicNavigationLink } from './public-navigation-link';

describe('Public navigation active links', () => {
  it.each([
    ['/', '/'],
    ['/libros', '/libros'],
    ['/libros/un-libro', '/libros'],
    ['/libros/', '/libros'],
    ['/autores', '/autores'],
    ['/autores/una-autora', '/autores'],
    ['/servicios-y-tarifas', '/servicios-y-tarifas'],
    ['/libros-extra', null],
    ['/autores-extra', null],
    ['/servicios-y-tarifas-extra', null],
    ['/politica-de-cookies', null],
    [null, null],
  ])('marks only the correct section for %s', (pathname, expectedHref) => {
    routing.pathname = pathname;
    for (const variant of ['desktop', 'mobile'] as const) {
      const html = renderToStaticMarkup(
        <nav>
          {publicNavigation.map((item) => (
            <PublicNavigationLink key={item.href} href={item.href} variant={variant}>
              {item.label}
            </PublicNavigationLink>
          ))}
        </nav>,
      );
      const activeLinks = (html.match(/<a\b[^>]*>/g) ?? []).filter((link) =>
        link.includes('aria-current="page"'),
      );
      expect(activeLinks).toHaveLength(expectedHref ? 1 : 0);
      if (expectedHref) expect(activeLinks[0]).toContain(`href="${expectedHref}"`);
    }
  });

  it('keeps desktop text black and places the rounded red underline outside normal flow', () => {
    routing.pathname = '/libros/un-libro';
    const html = renderToStaticMarkup(
      <PublicNavigationLink href="/libros">Libros</PublicNavigationLink>,
    );
    const anchor = html.match(/<a\b[^>]*>/)![0];
    expect(anchor).toContain('relative');
    expect(anchor).toContain('text-public-ink');
    expect(anchor).toContain('hover:text-public-red');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('absolute');
    expect(html).toContain('h-0.5');
    expect(html).toContain('rounded-full');
    expect(html).toContain('bg-public-red');
  });

  it('uses red text for the active mobile link without adding an underline', () => {
    routing.pathname = '/autores/una-autora';
    const active = renderToStaticMarkup(
      <PublicNavigationLink href="/autores" variant="mobile">
        Autores
      </PublicNavigationLink>,
    );
    const inactive = renderToStaticMarkup(
      <PublicNavigationLink href="/libros" variant="mobile">
        Libros
      </PublicNavigationLink>,
    );
    expect(active).toMatch(/class="[^"]*\stext-public-red(?:\s|")/);
    expect(active).toContain('aria-current="page"');
    expect(active).not.toContain('<span');
    expect(inactive).toContain('text-public-ink');
    expect(inactive).not.toContain('aria-current');
  });

  it('forwards link attributes used by the existing mobile sheet', () => {
    routing.pathname = '/';
    const html = renderToStaticMarkup(
      <PublicNavigationLink href="/" variant="mobile" data-state="closed" id="mobile-home">
        Inicio
      </PublicNavigationLink>,
    );
    expect(html).toContain('data-state="closed"');
    expect(html).toContain('id="mobile-home"');
    expect(html).toContain('href="/"');
  });
});
