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
      'id="calculadora"',
      'id="incluye"',
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
    expect(html).not.toContain('Un presupuesto. Todas las etapas esenciales.');
    expect(html.match(/id="calculator-heading"/g)).toHaveLength(1);
    expect(html.replace(/<svg\b[\s\S]*?<\/svg>/g, '')).not.toContain('A5');
  });

  it('connects the heading directly to the estimate without redundant introductory paragraphs', () => {
    const html = renderToStaticMarkup(<ServicesAndPricingPage />);
    const section = html.slice(html.indexOf('id="calculadora"')).split('</section>')[0];
    const afterHeading = section.slice(
      section.indexOf('</h2>') + 5,
      section.indexOf('role="group"'),
    );
    expect(afterHeading).not.toContain('<p');
    expect(section).not.toContain('Tu presupuesto reúne');
    expect(section).not.toContain('Elige el');
  });

  it('integrates the five included services above the controls in the same estimate group', () => {
    const html = renderToStaticMarkup(<ServicesAndPricingPage />);
    const section = html.slice(html.indexOf('id="calculadora"')).split('</section>')[0];
    const inclusions = section.slice(section.indexOf('id="incluye"')).split('</ul>')[0];

    expect(section).toContain('role="group" aria-label="Presupuesto de edición e impresión"');
    expect(section.match(/Tu presupuesto incluye/g)).toHaveLength(1);
    expect(inclusions.match(/<li[ >]/g)).toHaveLength(5);
    expect(inclusions).not.toContain('<article');
    expect(inclusions).toContain('Preparación profesional del interior del libro.');
    expect(inclusions).toContain('Creación y preparación de cubierta a color con solapas.');
    expect(inclusions).toContain('Producción de los ejemplares seleccionados');
    expect(inclusions).toContain('<h4>ISBN y depósito legal</h4>');
    expect(inclusions).toContain('Gestión de los trámites necesarios para la identificación');
    expect(inclusions).toContain('<h4>Distribución y envío</h4>');
    expect(inclusions).toContain('según las condiciones del servicio');
    expect(inclusions).toContain('con envío a un único punto de la península.');
    expect(inclusions).not.toContain('<h4>Envío</h4>');
    expect(section.indexOf('Tu presupuesto incluye')).toBeLessThan(section.indexOf('<fieldset'));
    expect(section.indexOf('<fieldset')).toBeLessThan(section.indexOf('<aside'));
    expect(section).toContain('555');
    expect(section).toContain('Copiar estimación');
    expect(section).toContain('Solicitar presupuesto personalizado');
    expect(section).toContain('270 g');
    expect(section).toContain('solapas de 9 cm');
    expect(section).toContain('sin IVA');
    expect(section).toContain('ISBN y depósito legal');
  });

  it('links the concise over-400-page note to the same existing contact form as the summary', () => {
    const html = renderToStaticMarkup(<ServicesAndPricingPage />);
    const section = html.slice(html.indexOf('id="calculadora"')).split('</section>')[0];
    const note = section.slice(section.lastIndexOf('<p')).split('</p>')[0];
    const contactHref = section.match(
      /href="([^"]+)"[^>]*>Solicitar presupuesto personalizado/,
    )?.[1];

    expect(contactHref).toBe('/#publica-tu-libro');
    expect(note).toContain(`href="${contactHref}"`);
    expect(note.replace(/<[^>]*>/g, '')).toBe(
      '¿Tu libro supera las 400 páginas? Solicita una propuesta personalizada.',
    );
    expect(section).not.toContain('No se incluyen por defecto');
    expect(section).not.toContain('Las opciones «Hasta…»');
  });

  it('keeps the FAQ and process consistent without promising automatic sales-channel placement', () => {
    const html = renderToStaticMarkup(<ServicesAndPricingPage />);
    const faq = html.slice(html.indexOf('id="preguntas"')).split('</section>')[0];
    const process = html.slice(html.indexOf('id="proceso"')).split('</section>')[0];

    expect(faq).toContain('impresión, ISBN y depósito legal, y distribución y envío');
    expect(faq).toContain(
      'No incluye por defecto corrección de estilo, corrección ortotipográfica, publicación en Amazon ni promoción.',
    );
    for (const title of ['ISBN y depósito legal', 'Distribución y envío']) {
      const step = process.slice(process.indexOf(`<h3>${title}</h3>`)).split('</article>')[0];
      expect(step).toContain('Incluidos en la propuesta');
      expect(step).not.toContain('Consultar condiciones');
    }
    expect(process).not.toContain('Disponibilidad del libro en canales y plataformas');
  });

  it('renders the default estimate and accessible inclusive page/copy controls', () => {
    const html = renderToStaticMarkup(<CompletePricingCalculator />);
    expect(html).toContain('555');
    expect(html).toContain('Hasta 200 páginas');
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Copiar estimación');
    expect(html).toContain('IVA no incluido');
    expect(html).toContain('id="total-price"');
    expect(html).toContain('id="unit-price"');
    expect(html).toMatch(/11,10\s*€/);
    expect(html).toContain('Por ejemplar');
    expect(html).toContain(
      'Maquetación · Cubierta · Impresión · ISBN y depósito legal · Distribución y envío',
    );
    expect(html).not.toContain('4 etapas');
    expect(html).toContain('Coste medio del presupuesto completo');
    expect(html).toContain('aria-describedby="unit-price-note"');
    expect(html).toContain('Formato 15 × 21 cm');
    expect(html).not.toContain('A5');
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
