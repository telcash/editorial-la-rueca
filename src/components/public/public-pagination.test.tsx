import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicPagination, PublicResultCount } from './public-pagination';

describe('PublicPagination', () => {
  it('preserves the search query while navigating pages', () => {
    const html = renderToStaticMarkup(
      <PublicPagination basePath="/autores" currentPage={2} totalPages={10} query="mestre" />,
    );

    expect(html).toContain('href="/autores?q=mestre"');
    expect(html).toContain('href="/autores?q=mestre&amp;page=3"');
    expect(html).toContain('Página 2 de 10');
  });

  it('disables previous on the first page and next on the last page', () => {
    const firstPage = renderToStaticMarkup(
      <PublicPagination basePath="/autores" currentPage={1} totalPages={10} />,
    );
    const lastPage = renderToStaticMarkup(
      <PublicPagination basePath="/autores" currentPage={10} totalPages={10} />,
    );

    expect(firstPage).toContain('aria-disabled="true"');
    expect(firstPage).toContain('href="/autores?page=2"');
    expect(lastPage).toContain('href="/autores?page=9"');
    expect(lastPage).toContain('aria-disabled="true"');
  });

  it('does not render pagination when all authors fit on one page', () => {
    const html = renderToStaticMarkup(
      <PublicPagination basePath="/autores" currentPage={1} totalPages={1} />,
    );

    expect(html).toBe('');
  });
});

describe('PublicResultCount', () => {
  it('shows the real filtered total instead of the current page size', () => {
    const html = renderToStaticMarkup(
      <PublicResultCount totalItems={190} singularLabel="autor" pluralLabel="autores" />,
    );

    expect(html).toContain('190 autores');
    expect(html).not.toContain('20 autores');
  });
});
