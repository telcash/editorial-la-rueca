import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';
import { BooksTable } from './books-table';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/features/admin/books/actions/bulk-book-actions', () => ({
  bulkUpdateBooksAction: vi.fn(),
}));

vi.mock('./book-archive-action-button', () => ({
  BookArchiveActionButton: ({ isArchived }: { isArchived: boolean }) => (
    <button type="button">{isArchived ? 'Restaurar' : 'Archivar'}</button>
  ),
}));

vi.mock('./book-permanent-delete-button', () => ({
  BookPermanentDeleteButton: () => <button type="button">Eliminar definitivamente</button>,
}));

const baseBook: BookWithDetails = {
  id: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  title: 'El jardín perdido',
  subtitle: null,
  slug: 'el-jardin-perdido',
  description: null,
  excerpt: null,
  coverUrl: null,
  originalPublicationDate: null,
  language: 'es',
  isFeatured: false,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  authors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Ana Autora',
      slug: 'ana-autora',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
  ],
  categories: [],
  editions: [],
};

function renderBooksTable(book: BookWithDetails, canDeletePermanently: boolean) {
  return renderToStaticMarkup(
    <BooksTable books={[book]} canDeletePermanently={canDeletePermanently} />,
  );
}

describe('BooksTable permanent delete UI', () => {
  it('does not show hard delete for active books when the user is admin', () => {
    const html = renderBooksTable(baseBook, true);

    expect(html).toContain('Editar');
    expect(html).toContain('Archivar');
    expect(html).not.toContain('Eliminar definitivamente');
  });

  it('shows hard delete for archived books when the user is admin', () => {
    const html = renderBooksTable({ ...baseBook, isArchived: true }, true);

    expect(html).toContain('Restaurar');
    expect(html).toContain('Eliminar definitivamente');
  });

  it('does not show hard delete for archived books when the user is editor', () => {
    const html = renderBooksTable({ ...baseBook, isArchived: true }, false);

    expect(html).toContain('Restaurar');
    expect(html).not.toContain('Eliminar definitivamente');
  });
});
