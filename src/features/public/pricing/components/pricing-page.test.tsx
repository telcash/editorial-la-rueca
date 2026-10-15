import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({ Coustard: () => ({ variable: 'coustard' }) }));
vi.mock('@/services/authors/author.service', () => ({
  listPublishedAuthors: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/books/book.service', () => ({
  listPublishedBooks: vi.fn().mockResolvedValue([]),
}));

import ServicesAndPricingPage, { metadata } from '@/app/(public)/servicios-y-tarifas/page';
import sitemap from '@/app/sitemap';
import { publicNavigation, publicFooterNavigation } from '@/components/public/public-navigation';
import { CompletePricingCalculator, IndividualPricingCalculators } from './pricing-calculators';

afterEach(() => vi.unstubAllEnvs());

describe('Services and pricing public page', () => {
  it('preserves the approved section order without a price table or duplicated layout', () => {
    const html = renderToStaticMarkup(<ServicesAndPricingPage />);
    const anchors = [
      'id="incluye"',
      'id="calculadora"',
      'id="individuales"',
      'id="proceso"',
      'id="preguntas"',
      'id="cta-heading"',
    ];
    const positions = anchors.map((anchor) => html.indexOf(anchor));
    expect(positions.every((value) => value >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).not.toContain('<table');
    expect(html).not.toContain('<footer');
    expect(html).not.toContain('mailto:');
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain('Tu libro, tus derechos.');
    expect(html.match(/<details/g)).toHaveLength(8);
    expect(html).toContain('href="/#publica-tu-libro"');
  });

  it('renders the default estimate and accessible inclusive page/copy controls', () => {
    const html = renderToStaticMarkup(<CompletePricingCalculator />);
    expect(html).toContain('555');
    expect(html).toContain('Hasta 200 páginas');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Copiar estimación');
    expect(html).toContain('IVA no incluido');
  });

  it('renders seven services and only the selected tab panel visibly', () => {
    const html = renderToStaticMarkup(<IndividualPricingCalculators />);
    expect(html.match(/<article/g)).toHaveLength(7);
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(html.match(/hidden=""/g)).toHaveLength(2);
    expect(html).not.toContain('htmlFor');
    expect(html).toContain('for="layout-pages"');
    expect(html).toContain('for="printing-copies"');
    expect(html).toContain('cinco ejemplares menos');
    expect(html).toContain('45 ejemplares');
    expect(html).toContain('0,011');
  });

  it('is linked from desktop/mobile shared navigation and footer and has a canonical', () => {
    for (const navigation of [publicNavigation, publicFooterNavigation]) {
      expect(navigation).toContainEqual({
        label: 'Servicios y tarifas',
        href: '/servicios-y-tarifas',
      });
    }
    expect(metadata.alternates).toEqual({ canonical: '/servicios-y-tarifas' });
    expect(metadata.description).toContain('presupuesto');
  });

  it('includes the page in the generated sitemap using the configured canonical host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.editoriallarueca.com');
    expect(await sitemap()).toContainEqual({
      url: 'https://www.editoriallarueca.com/servicios-y-tarifas',
    });
  });
});
