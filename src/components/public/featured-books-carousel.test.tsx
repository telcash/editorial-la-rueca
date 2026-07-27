import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { BookWithDetails } from '@/services/books/book.types';
import { FeaturedBooksCarousel } from './featured-books-carousel';

const book: BookWithDetails = {
  id: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  title: 'Cruce de Pasos',
  subtitle: null,
  slug: 'cruce-de-pasos',
  description: null,
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
      name: 'Ana Córdoba del Campo',
      slug: 'ana-cordoba-del-campo',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
  ],
  categories: [],
  editions: [],
};

const secondBook: BookWithDetails = {
  ...book,
  id: 'd66f117d-a773-4517-818a-b74706abb43f',
  slug: 'titulo-del-libro',
  title: 'Titulo del libro',
};

describe('FeaturedBooksCarousel', () => {
  it('uses one centered mobile slide and keeps tablet/desktop slides compact', () => {
    const html = renderToStaticMarkup(<FeaturedBooksCarousel books={[book, secondBook]} />);

    expect(html).toContain('data-carousel-track="featured-books"');
    expect(html).toContain('data-carousel-slide="featured-book"');
    expect(html).toContain('basis-[calc(100vw-32px)]');
    expect(html).toContain('max-w-[calc(100vw-32px)]');
    expect(html).toContain('snap-center');
    expect(html).toContain('justify-center');
    expect(html).toContain('sm:basis-[170px]');
    expect(html).toContain('sm:max-w-none');
    expect(html).toContain('sm:snap-start');
  });

  it('lets the BookCard fill the wider mobile slide without changing tablet dimensions', () => {
    const html = renderToStaticMarkup(<FeaturedBooksCarousel books={[book]} />);

    expect(html).toContain('max-sm:!w-full');
    expect(html).toContain('max-sm:!h-auto');
    expect(html).toContain('max-sm:[&amp;_article&gt;div:first-child&gt;div]:!h-auto');
    expect(html).toContain('max-sm:[&amp;_article&gt;div:last-child]:!h-[96px]');
  });

  it('keeps mobile swipe spacing controlled and avoids horizontal overflow from outer padding', () => {
    const html = renderToStaticMarkup(<FeaturedBooksCarousel books={[book]} />);

    expect(html).toContain('-mx-4');
    expect(html).toContain('px-4');
    expect(html).toContain('scroll-px-4');
    expect(html).toContain('gap-3.5');
    expect(html).toContain('sm:mx-0');
    expect(html).toContain('sm:gap-5');
  });

  it('hides carousel arrows on mobile and keeps them available from tablet widths', () => {
    const html = renderToStaticMarkup(<FeaturedBooksCarousel books={[book]} />);

    expect(html).toContain('aria-label="Libros anteriores"');
    expect(html).toContain('aria-label="Libros siguientes"');
    expect(html).toContain('hidden size-11');
    expect(html).toContain('md:inline-flex');
  });

  it('keeps the complete catalog link on the public home', () => {
    const homePage = readFileSync(join(process.cwd(), 'src/app/(public)/page.tsx'), 'utf8');

    expect(homePage).toContain(
      '<PublicCtaLink href="/libros">Ver catálogo completo</PublicCtaLink>',
    );
  });
});
