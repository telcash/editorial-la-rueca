import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';
import { BookCard } from './book-card';

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <span data-src={src} aria-label={alt} className={className} />
  ),
}));

const book: BookWithDetails = {
  id: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  title: 'Un título suficientemente largo para comprobar el límite visual de la tarjeta',
  subtitle: null,
  slug: 'titulo-largo',
  description: '<p>Sinopsis larga para el preview.</p>',
  excerpt: null,
  coverUrl: null,
  originalPublicationDate: null,
  language: 'es',
  isFeatured: true,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
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

describe('BookCard', () => {
  it('renders the whole card as a link to the book detail', () => {
    const html = renderToStaticMarkup(<BookCard book={book} />);

    expect(html).toContain('href="/libros/titulo-largo"');
    expect(html).toContain('Ver libro Un título suficientemente largo');
  });

  it('keeps a compact card width, stable cover placeholder and fixed information area', () => {
    const html = renderToStaticMarkup(<BookCard book={book} />);

    expect(html).toContain('width:170px;height:331px');
    expect(html).toContain('height:248px');
    expect(html).toContain('height:83px');
    expect(html).toContain('Editorial La Rueca');
  });

  it('keeps the title above the author with fixed text clamps', () => {
    const html = renderToStaticMarkup(<BookCard book={book} />);
    const titleIndex = html.indexOf(book.title);
    const authorIndex = html.indexOf('Ana Autora');

    expect(titleIndex).toBeGreaterThan(-1);
    expect(authorIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeLessThan(authorIndex);
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('height:36px');
    expect(html).toContain('height:30px');
    expect(html).not.toContain('uppercase');
    expect(html).not.toContain('truncate');
  });

  it('contains real covers without internal padding and preserves their proportion', () => {
    const html = renderToStaticMarkup(
      <BookCard book={{ ...book, coverUrl: 'https://example.com/cover.jpg' }} />,
    );

    expect(html).toContain('object-contain');
    expect(html).not.toContain('object-contain p-');
  });
});
