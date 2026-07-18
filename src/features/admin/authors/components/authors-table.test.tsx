import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Author } from '@/db/schema';
import type { AuthorAdminListItem } from '@/services/authors/author-service.types';
import { AuthorsTable } from './authors-table';

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

function renderAuthorsTable(author: Author, bookCount: number, canDeletePermanently: boolean) {
  const authors: AuthorAdminListItem[] = [{ author, bookCount }];

  return renderToStaticMarkup(
    <AuthorsTable authors={authors} canDeletePermanently={canDeletePermanently} />,
  );
}

describe('AuthorsTable permanent delete UI', () => {
  it('does not show hard delete for active authors when the user is admin', () => {
    const html = renderAuthorsTable(baseAuthor, 0, true);

    expect(html).toContain('Editar');
    expect(html).toContain('Archivar');
    expect(html).not.toContain('Eliminar definitivamente');
  });

  it('shows hard delete for archived authors when the user is admin', () => {
    const html = renderAuthorsTable({ ...baseAuthor, isArchived: true }, 0, true);

    expect(html).toContain('Editar');
    expect(html).toContain('Restaurar');
    expect(html).toContain('Eliminar definitivamente');
  });

  it('does not show hard delete for archived authors when the user is editor', () => {
    const html = renderAuthorsTable({ ...baseAuthor, isArchived: true }, 0, false);

    expect(html).toContain('Restaurar');
    expect(html).not.toContain('Eliminar definitivamente');
  });

  it('blocks hard delete and shows a reason when the archived author has books', () => {
    const html = renderAuthorsTable({ ...baseAuthor, isArchived: true }, 2, true);

    expect(html).toContain('disabled=""');
    expect(html).toContain('No se puede eliminar porque está relacionado con');
    expect(html).toContain('2 libros');
  });
});
