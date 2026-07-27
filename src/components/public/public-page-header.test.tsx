import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicPageHeader } from './public-page-header';
import { PublicSection } from './public-section';

const projectRoot = process.cwd();

describe('PublicPageHeader', () => {
  it('renders the page title and optional description', () => {
    const html = renderToStaticMarkup(
      <PublicPageHeader title="Libros" description="Explora el catálogo editorial." />,
    );

    expect(html).toContain('<h1');
    expect(html).toContain('Libros');
    expect(html).toContain('Explora el catálogo editorial.');
  });

  it('omits the description when it is not provided', () => {
    const html = renderToStaticMarkup(<PublicPageHeader title="Autores" />);

    expect(html).toContain('Autores');
    expect(html).not.toContain('<p');
  });

  it('can render additional header content', () => {
    const html = renderToStaticMarkup(
      <PublicPageHeader title="Libros">
        <div data-testid="header-extra">Extra</div>
      </PublicPageHeader>,
    );

    expect(html).toContain('data-testid="header-extra"');
  });

  it('keeps descriptions wrapping inside a bounded readable width', () => {
    const html = renderToStaticMarkup(
      <PublicPageHeader
        title="Libros"
        description="Una descripción suficientemente larga para comprobar que el encabezado permite varias líneas sin salirse del viewport."
      />,
    );

    expect(html).toContain('max-w-[48rem]');
    expect(html).toContain('whitespace-normal');
    expect(html).toContain('break-words');
  });

  it('keeps only bottom spacing and header-content spacing in the page header', () => {
    const html = renderToStaticMarkup(<PublicPageHeader title="Libros" />);

    expect(html).not.toContain('pt-');
    expect(html).toContain('pb-5');
    expect(html).toContain('md:pb-6');
    expect(html).toContain('lg:pb-8');
  });

  it('uses compact top spacing in PublicSection while preserving the previous bottom spacing', () => {
    const defaultHtml = renderToStaticMarkup(<PublicSection />);
    const compactHtml = renderToStaticMarkup(<PublicSection variant="compact" />);

    expect(defaultHtml).toContain('pt-7');
    expect(defaultHtml).toContain('md:pt-10');
    expect(defaultHtml).toContain('lg:pt-12');
    expect(defaultHtml).toContain('pb-12');
    expect(defaultHtml).toContain('md:pb-20');
    expect(defaultHtml).toContain('lg:pb-24');
    expect(compactHtml).toContain('pt-6');
    expect(compactHtml).toContain('md:pt-8');
    expect(compactHtml).toContain('lg:pt-10');
    expect(compactHtml).toContain('pb-8');
    expect(compactHtml).toContain('md:pb-12');
    expect(compactHtml).toContain('lg:pb-16');
  });

  it('is used by the public books and authors index pages without replacing their own content', () => {
    const booksPage = readFileSync(join(projectRoot, 'src/app/(public)/libros/page.tsx'), 'utf8');
    const authorsPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/page.tsx'),
      'utf8',
    );

    expect(booksPage).toContain('<PublicPageHeader');
    expect(authorsPage).toContain('<PublicPageHeader');
    expect(booksPage).toContain('<PublicSearchForm');
    expect(authorsPage).toContain('<PublicSearchForm');
    expect(booksPage).toContain('<BookCard');
    expect(authorsPage).toContain('<AuthorCard');
  });

  it('keeps books and authors from adding independent top spacing or changing the global header', () => {
    const publicLayout = readFileSync(join(projectRoot, 'src/app/(public)/layout.tsx'), 'utf8');
    const publicHeader = readFileSync(
      join(projectRoot, 'src/components/public/public-header.tsx'),
      'utf8',
    );
    const booksPage = readFileSync(join(projectRoot, 'src/app/(public)/libros/page.tsx'), 'utf8');
    const authorsPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/page.tsx'),
      'utf8',
    );

    expect(publicLayout).toContain('<main className="flex-1">{children}</main>');
    expect(publicHeader).toContain('className="sticky top-0');
    expect(publicHeader).toContain('h-16');
    expect(booksPage).toContain('<PublicSection>');
    expect(authorsPage).toContain('<PublicSection>');
    expect(booksPage).not.toContain('mt-8 space-y-5');
    expect(authorsPage).not.toContain('mt-8 space-y-5');
  });

  it('does not apply the list page header to home or public detail pages', () => {
    const homePage = readFileSync(join(projectRoot, 'src/app/(public)/page.tsx'), 'utf8');
    const bookDetailPage = readFileSync(
      join(projectRoot, 'src/app/(public)/libros/[slug]/page.tsx'),
      'utf8',
    );
    const authorDetailPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/[slug]/page.tsx'),
      'utf8',
    );

    expect(homePage).not.toContain('PublicPageHeader');
    expect(bookDetailPage).not.toContain('PublicPageHeader');
    expect(authorDetailPage).not.toContain('PublicPageHeader');
  });
});
