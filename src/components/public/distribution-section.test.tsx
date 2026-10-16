import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({ Coustard: () => ({ className: 'coustard' }) }));

import { DistributionSection } from './distribution-section';

describe('DistributionSection', () => {
  it('preserves the approved copy and labelled section without adding buttons', () => {
    const html = renderToStaticMarkup(<DistributionSection />);
    expect(html).toContain('aria-labelledby="distribution-heading"');
    expect(html).toContain('MÁS ALLÁ DE LA PUBLICACIÓN');
    expect(html).toContain('Publicar tu libro es solo el comienzo');
    expect(html).toContain('En Editorial La Rueca te acompañamos también en su distribución');
    expect(html).toContain('a través de nuestros colaboradores especializados.');
    expect(html).toContain('coustard');
    expect(html).not.toContain('<button');
  });

  it('uses all four supplied image assets with accessible names and preserved proportions', () => {
    const html = renderToStaticMarkup(<DistributionSection />);
    expect(html.match(/<img\b/g)).toHaveLength(4);
    expect(html.match(/<li\b/g)).toHaveLength(4);
    for (const [name, file] of [
      ['Amazon Kindle Direct Publishing', 'amazon.jpg'],
      ['Azeta', 'azeta.png'],
      ['Podibooks', 'podibooks.jpg'],
      ['Quares', 'quares.jpg'],
    ]) {
      expect(html).toContain(`alt="${name}"`);
      expect(html).toContain(encodeURIComponent(`/distribution/${file}`));
      expect(readFileSync(join(process.cwd(), 'public/distribution', file)).length).toBeGreaterThan(
        0,
      );
    }
    expect(html).toContain('object-contain');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('md:grid-cols-4');
    expect(html).not.toContain('azeta.jpg');
    const azeta = (html.match(/<img\b[^>]*>/g) ?? []).find((img) => img.includes('alt="Azeta"'));
    expect(azeta).toContain('width="185"');
    expect(azeta).toContain('height="44"');
  });

  it('links each logo to its official website securely with an accessible name and visible focus', () => {
    const html = renderToStaticMarkup(<DistributionSection />);
    const links = html.match(/<a\b[\s\S]*?<\/a>/g) ?? [];
    expect(links).toHaveLength(4);
    for (const [index, [company, href]] of [
      ['Amazon', 'https://www.amazon.es/'],
      ['Azeta', 'https://www.azeta.es/'],
      ['Podibooks', 'https://www.podibooks.com/'],
      ['Quares', 'https://www.quares.es/'],
    ].entries()) {
      expect(links[index]).toContain(`href="${href}"`);
      expect(links[index]).toContain('target="_blank"');
      expect(links[index]).toContain('rel="noopener noreferrer"');
      expect(links[index]).toContain(
        `aria-label="Visitar la web oficial de ${company} (se abre en una pestaña nueva)"`,
      );
      expect(links[index]).toContain('<img');
      expect(links[index]).toContain('hover:opacity-80');
      expect(links[index]).toContain('focus-visible:ring-2');
      expect(links[index]).toContain('focus-visible:ring-public-red');
      expect(links[index]).not.toContain('scale-');
      expect(links[index]).not.toContain('tabindex="-1"');
    }
  });

  it('is placed after featured books and before testimonials without moving the other sections', () => {
    const home = readFileSync(join(process.cwd(), 'src/app/(public)/page.tsx'), 'utf8');
    const books = home.indexOf('<FeaturedBooksCarousel');
    const distribution = home.indexOf('<DistributionSection />');
    const testimonials = home.indexOf('<TestimonialsSection');
    const authors = home.indexOf('<FeaturedAuthorsCarousel');
    expect(books).toBeGreaterThan(0);
    expect(distribution).toBeGreaterThan(books);
    expect(testimonials).toBeGreaterThan(distribution);
    expect(authors).toBeGreaterThan(testimonials);
  });
});
