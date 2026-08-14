import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BookFormAuthorSummary } from '../types/book-form-state';
import { BookAuthorsSection } from './book-authors-section';

const longNameAuthor: BookFormAuthorSummary = {
  id: 'author-1',
  name: 'Ana María del Carmen González de la Fuente y del Campo con Nombre Muy Largo',
  slug: 'ana-maria-del-carmen-gonzalez-de-la-fuente-y-del-campo-con-slug-muy-largo',
  photoUrl: null,
  isArchived: false,
};

const secondAuthor: BookFormAuthorSummary = {
  id: 'author-2',
  name: 'Beatriz Luna',
  slug: 'beatriz-luna',
  photoUrl: 'https://example.com/author.jpg',
  isArchived: false,
};

function renderSection() {
  return renderToStaticMarkup(
    <BookAuthorsSection
      authors={[longNameAuthor]}
      selectedAuthors={[longNameAuthor, secondAuthor]}
      searchQuery="ana"
      onSearchQueryChange={vi.fn()}
      onAddAuthor={vi.fn()}
      onMoveAuthorUp={vi.fn()}
      onMoveAuthorDown={vi.fn()}
      onRemoveAuthor={vi.fn()}
    />,
  );
}

describe('BookAuthorsSection responsive layout', () => {
  it('renders search above a responsive author selection grid', () => {
    const html = renderSection();

    expect(html).toContain('Buscar autor');
    expect(html).toContain('data-layout="book-authors-responsive-grid"');
    expect(html).toContain('Resultados');
    expect(html).toContain('Autores seleccionados');
    expect(html).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]');
  });

  it('renders available author rows with flexible text and a compact add button', () => {
    const html = renderSection();

    expect(html).toContain('data-layout="author-search-results"');
    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(html).toContain(`aria-label="Añadir ${longNameAuthor.name}"`);
    expect(html).toContain(longNameAuthor.slug);
  });

  it('renders selected authors with fixed controls and flexible text', () => {
    const html = renderSection();

    expect(html).toContain('data-layout="selected-authors-list"');
    expect(html).toContain('data-layout="selected-author-row"');
    expect(html).toContain('grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto]');
    expect(html).toContain(`aria-label="Subir ${secondAuthor.name}"`);
    expect(html).toContain(`aria-label="Bajar ${longNameAuthor.name}"`);
    expect(html).toContain(`aria-label="Eliminar ${longNameAuthor.name}"`);
  });
});
