import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CatalogFilters } from './catalog-filters';

describe('CatalogFilters', () => {
  it('renders an optional sort selector with the current value', () => {
    const html = renderToStaticMarkup(
      <CatalogFilters
        action="/admin/authors"
        status="active"
        query="poesia"
        published="all"
        featured="all"
        image="all"
        imageLabel="Foto"
        searchPlaceholder="Buscar autores..."
        sort="published-books-desc"
        sortOptions={[
          { value: 'name-asc', label: 'Nombre A-Z' },
          { value: 'published-books-desc', label: 'Más libros publicados' },
        ]}
        defaultSort="name-asc"
        pageSize={50}
      />,
    );

    expect(html).toContain('name="sort"');
    expect(html).toContain('value="published-books-desc" selected=""');
    expect(html).toContain('Orden: Más libros publicados');
    expect(html).toContain('name="pageSize" value="50"');
  });

  it('keeps sort controls and actions in a secondary layout region', () => {
    const html = renderToStaticMarkup(
      <CatalogFilters
        action="/admin/authors"
        status="active"
        query=""
        published="all"
        featured="all"
        image="all"
        imageLabel="Foto"
        searchPlaceholder="Buscar autores..."
        sort="name-asc"
        sortOptions={[{ value: 'name-asc', label: 'Nombre A-Z' }]}
        defaultSort="name-asc"
        pageSize={20}
      />,
    );

    expect(html).toContain('data-layout="catalog-filters-primary"');
    expect(html).toContain('data-layout="catalog-filters-secondary"');
    expect(html).toContain('data-layout="catalog-filters-actions"');
    expect(html.indexOf('name="sort"')).toBeLessThan(
      html.indexOf('data-layout="catalog-filters-actions"'),
    );
  });

  it('omits the sort selector when no sort options are provided', () => {
    const html = renderToStaticMarkup(
      <CatalogFilters
        action="/admin/books"
        status="active"
        query=""
        published="all"
        featured="all"
        image="all"
        imageLabel="Portada"
        searchPlaceholder="Buscar libros..."
        pageSize={20}
      />,
    );

    expect(html).not.toContain('name="sort"');
  });
});
