import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { AuthorRelatedBook } from '@/services/authors/author-service.types';
import { AuthorBooksSection } from './author-books-section';

const baseBook: AuthorRelatedBook = {
  id: 'a5c5e7a9-e5c6-45e4-b359-bd83656690d2',
  title: 'Cruce de Pasos',
  slug: 'cruce-de-pasos',
  coverUrl: 'https://example.com/cruce-de-pasos.jpg',
  isPublished: true,
  isArchived: false,
  isFeatured: false,
  updatedAt: new Date('2026-02-01T00:00:00.000Z'),
};

describe('AuthorBooksSection', () => {
  it('renders the empty state when the author has no books', () => {
    const html = renderToStaticMarkup(<AuthorBooksSection books={[]} />);

    expect(html).toContain('Libros del autor');
    expect(html).toContain('0 libros');
    expect(html).toContain('Este autor todavía no tiene libros asociados.');
  });

  it('renders singular count and edit link for one related book', () => {
    const html = renderToStaticMarkup(<AuthorBooksSection books={[baseBook]} />);

    expect(html).toContain('1 libro');
    expect(html).toContain('Cruce de Pasos');
    expect(html).toContain('cruce-de-pasos');
    expect(html).toContain(`href="/admin/books/${baseBook.id}"`);
    expect(html).toContain('Publicado');
  });

  it('renders multiple books with draft, archived, featured and missing-cover states', () => {
    const draftBook: AuthorRelatedBook = {
      ...baseBook,
      id: '41e35db4-e4b9-4fd6-bd10-c5cc85fdc94d',
      title: 'No te vi venir, pues jamás te hubiese dejado entrar',
      slug: 'no-te-vi-venir-pues-jamas-te-hubiese-dejado-entrar',
      coverUrl: null,
      isPublished: false,
      isFeatured: true,
    };
    const archivedBook: AuthorRelatedBook = {
      ...baseBook,
      id: 'c6c27762-f342-4fde-960d-f2b21af0b240',
      title: 'Libro archivado',
      slug: 'libro-archivado',
      coverUrl: null,
      isArchived: true,
    };
    const html = renderToStaticMarkup(
      <AuthorBooksSection books={[baseBook, draftBook, archivedBook]} />,
    );

    expect(html).toContain('3 libros');
    expect(html).toContain(draftBook.title);
    expect(html).toContain('Borrador');
    expect(html).toContain('Archivado');
    expect(html).toContain('Destacado');
    expect(html).toContain(`href="/admin/books/${draftBook.id}"`);
    expect(html).toContain(`href="/admin/books/${archivedBook.id}"`);
  });
});
