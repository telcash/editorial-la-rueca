import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Author } from '@/db/schema';
import type { AuthorAdminListItem } from '@/services/authors/author-service.types';
import { AuthorsTable } from './authors-table';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/features/admin/authors/actions/bulk-author-actions', () => ({
  bulkUpdateAuthorsAction: vi.fn(),
}));

vi.mock('./author-archive-action-button', () => ({
  AuthorArchiveActionButton: ({ isArchived }: { isArchived: boolean }) => (
    <button type="button">{isArchived ? 'Restaurar' : 'Archivar'}</button>
  ),
}));

vi.mock('./author-permanent-delete-button', () => ({
  AuthorPermanentDeleteButton: ({ bookCount }: { bookCount: number }) => (
    <button type="button" disabled={bookCount > 0}>
      Eliminar definitivamente
    </button>
  ),
}));

const baseAuthor: Author = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ana Autora',
  slug: 'ana-autora',
  shortBio: null,
  biography: null,
  photoUrl: null,
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: null,
  isFeatured: false,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function renderAuthorsTable({
  author,
  bookCount,
  canDeletePermanently,
  publishedBooksCount = 0,
  publishedBooksPreview = [],
}: {
  author: Author;
  bookCount: number;
  canDeletePermanently: boolean;
  publishedBooksCount?: number;
  publishedBooksPreview?: AuthorAdminListItem['publishedBooksPreview'];
}) {
  const authors: AuthorAdminListItem[] = [
    { author, bookCount, publishedBooksCount, publishedBooksPreview },
  ];

  return renderToStaticMarkup(
    <AuthorsTable authors={authors} canDeletePermanently={canDeletePermanently} />,
  );
}

describe('AuthorsTable permanent delete UI', () => {
  it('does not show hard delete for active authors when the user is admin', () => {
    const html = renderAuthorsTable({
      author: baseAuthor,
      bookCount: 0,
      canDeletePermanently: true,
    });

    expect(html).toContain('Editar');
    expect(html).toContain('Archivar');
    expect(html).not.toContain('Eliminar definitivamente');
  });

  it('shows hard delete for archived authors when the user is admin', () => {
    const html = renderAuthorsTable({
      author: { ...baseAuthor, isArchived: true },
      bookCount: 0,
      canDeletePermanently: true,
    });

    expect(html).toContain('Editar');
    expect(html).toContain('Restaurar');
    expect(html).toContain('Eliminar definitivamente');
  });

  it('does not show hard delete for archived authors when the user is editor', () => {
    const html = renderAuthorsTable({
      author: { ...baseAuthor, isArchived: true },
      bookCount: 0,
      canDeletePermanently: false,
    });

    expect(html).toContain('Restaurar');
    expect(html).not.toContain('Eliminar definitivamente');
  });

  it('blocks hard delete and shows a reason when the archived author has books', () => {
    const html = renderAuthorsTable({
      author: { ...baseAuthor, isArchived: true },
      bookCount: 2,
      canDeletePermanently: true,
    });

    expect(html).toContain('disabled=""');
    expect(html).toContain('No se puede eliminar porque está relacionado con');
    expect(html).toContain('2 libros');
  });
});

describe('AuthorsTable published books UI', () => {
  it('shows published book links and the remaining count', () => {
    const html = renderAuthorsTable({
      author: baseAuthor,
      bookCount: 5,
      canDeletePermanently: false,
      publishedBooksCount: 5,
      publishedBooksPreview: [
        { id: 'book-1', title: 'Cruce de Pasos' },
        { id: 'book-2', title: 'El Valle de Cristal' },
        { id: 'book-3', title: 'La luz después' },
      ],
    });

    expect(html).toContain('Libros publicados');
    expect(html).toContain('/admin/books/book-1');
    expect(html).toContain('Cruce de Pasos');
    expect(html).toContain('+ 2 más');
  });

  it('shows an empty message when an author has no published books', () => {
    const html = renderAuthorsTable({
      author: baseAuthor,
      bookCount: 2,
      canDeletePermanently: false,
      publishedBooksCount: 0,
    });

    expect(html).toContain('Sin libros publicados');
  });
});
