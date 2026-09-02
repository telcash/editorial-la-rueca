import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BookAuthorsLinks } from '@/components/public/books/book-authors-links';
import { BookCategoryBadges } from '@/components/public/books/book-category-badges';
import { BookDetailHero } from '@/components/public/books/book-detail-hero';
import { BookEditionCard } from '@/components/public/books/book-edition-card';
import { BookEditionsSection } from '@/components/public/books/book-editions-section';
import { BookMetaGrid } from '@/components/public/books/book-meta-grid';
import { BookPurchaseSection } from '@/components/public/books/book-purchase-section';
import { BookRelatedSection } from '@/components/public/books/book-related-section';
import { PublicBookCover } from '@/components/public/books/public-book-cover';
import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <span data-src={src} aria-label={alt} className={className} />
  ),
}));

const edition: BookEditionDetails = {
  id: 'a301b33b-aa0d-470f-a6cc-60f0b9dcacbf',
  bookId: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  format: 'paperback',
  editionLabel: '3.ª edición',
  publicationDate: '2026-01-01',
  isbn10: null,
  isbn13: '9788412345678',
  price: '19.90',
  currency: 'EUR',
  pages: 312,
  isAvailable: true,
  isFeatured: true,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const book: BookWithDetails = {
  id: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  title: 'Cruce de Pasos',
  subtitle: 'Memoria y viaje',
  slug: 'cruce-de-pasos',
  description: 'Sinopsis completa',
  excerpt: 'Una novela que entrelaza memorias familiares.',
  coverUrl: 'https://example.com/cover.jpg',
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
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  authors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Ana Córdoba del Campo',
      slug: 'ana-cordoba-del-campo',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
    {
      id: '07daf536-1ccc-4b0a-8e3c-7d20f7211a25',
      name: 'Ángel García Muñoz',
      slug: 'angel-garcia-munoz',
      photoUrl: null,
      isArchived: false,
      sortOrder: 1,
    },
  ],
  categories: [
    {
      id: 'b6c01145-e237-4f1f-acb9-a60067a167d4',
      name: 'Novela histórica',
      slug: 'novela-historica',
      isArchived: false,
      sortOrder: 0,
    },
  ],
  editions: [edition],
};

describe('public book detail components', () => {
  it('renders a real cover with contained image and an accessible placeholder without cover', () => {
    const coverHtml = renderToStaticMarkup(
      <PublicBookCover coverUrl={book.coverUrl} title={book.title} />,
    );
    const placeholderHtml = renderToStaticMarkup(
      <PublicBookCover coverUrl={null} title={book.title} />,
    );

    expect(coverHtml).toContain('data-src="https://example.com/cover.jpg"');
    expect(coverHtml).toContain('object-contain');
    expect(coverHtml).toContain('bg-public-placeholder-background');
    expect(placeholderHtml).toContain('Portada no disponible');
    expect(placeholderHtml).toContain('aria-label="Portada no disponible para Cruce de Pasos"');
  });

  it('renders linked authors with a natural Spanish separator', () => {
    const html = renderToStaticMarkup(<BookAuthorsLinks authors={book.authors} />);

    expect(html).toContain('Por');
    expect(html).toContain('href="/autores/ana-cordoba-del-campo"');
    expect(html).toContain('Ana Córdoba del Campo</a> y ');
    expect(html).toContain('Ángel García Muñoz');
  });

  it('renders available badges without empty technical values', () => {
    const html = renderToStaticMarkup(<BookCategoryBadges book={book} primaryEdition={edition} />);

    expect(html).toContain('Novela histórica');
    expect(html).toContain('Destacado');
    expect(html).toContain('Novedad');
    expect(html).toContain('3.ª edición');
    expect(html).not.toContain('undefined');
  });

  it('renders semantic metadata and omits an empty grid', () => {
    const html = renderToStaticMarkup(<BookMetaGrid items={[{ label: 'Año', value: '2026' }]} />);
    const emptyHtml = renderToStaticMarkup(<BookMetaGrid items={[]} />);

    expect(html).toContain('<dl');
    expect(html).toContain('<dt');
    expect(html).toContain('<dd');
    expect(html).toContain('shadow-public-subtle');
    expect(emptyHtml).toBe('');
  });

  it('renders the hero with one h1, CTAs and metadata summary', () => {
    const html = renderToStaticMarkup(
      <BookDetailHero
        book={book}
        primaryEdition={edition}
        summary="Una novela que entrelaza memorias familiares."
        metaItems={[{ label: 'ISBN', value: '9788412345678' }]}
      />,
    );

    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain('Cruce de Pasos');
    expect(html).toContain('Memoria y viaje');
    expect(html).toContain('Solicitar información');
    expect(html).toContain('href="/#contacto"');
    expect(html).toContain('Ver catálogo');
    expect(html).toContain('9788412345678');
  });

  it('renders an edition card with primary state, availability, price and ISBN', () => {
    const html = renderToStaticMarkup(<BookEditionCard edition={edition} isPrimary />);

    expect(html).toContain('Edición principal');
    expect(html).toContain('Edición destacada');
    expect(html).toContain('Disponible');
    expect(html).toContain('9788412345678');
    expect(html).toContain('19,90');
  });

  it('omits editions and related sections when there is no data', () => {
    expect(renderToStaticMarkup(<BookEditionsSection editions={[]} />)).toBe('');
    expect(renderToStaticMarkup(<BookRelatedSection books={[]} />)).toBe('');
  });

  it('omits the purchase section when there are no public options', () => {
    expect(renderToStaticMarkup(<BookPurchaseSection channels={[]} />)).toBe('');
  });

  it('renders multiple resolved Quares markets as secure external links', () => {
    const html = renderToStaticMarkup(
      <BookPurchaseSection
        channels={[
          {
            channel: { slug: 'quares', name: 'Quares' },
            options: [
              {
                marketName: 'España',
                countryCode: 'ES',
                url: 'https://tienda.editoriallarueca.com/book/67778',
              },
              {
                marketName: 'Colombia',
                countryCode: 'CO',
                url: 'https://colombia.editoriallarueca.com/book/67778',
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('Comprar');
    expect(html).toContain('Quares');
    expect(html).toContain('España');
    expect(html).toContain('Colombia');
    expect(html).toContain('href="https://tienda.editoriallarueca.com/book/67778"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('renders the Amazon purchase URL without assuming a marketplace domain', () => {
    const html = renderToStaticMarkup(
      <BookPurchaseSection
        channels={[
          {
            channel: { slug: 'amazon', name: 'Amazon' },
            options: [
              {
                marketName: null,
                countryCode: null,
                url: 'https://www.amazon.com/dp/example',
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('Comprar en Amazon');
    expect(html).toContain('href="https://www.amazon.com/dp/example"');
  });

  it('renders Quares and Amazon together without reconstructing their URLs', () => {
    const html = renderToStaticMarkup(
      <BookPurchaseSection
        channels={[
          {
            channel: { slug: 'quares', name: 'Quares' },
            options: [
              {
                marketName: 'México',
                countryCode: 'MX',
                url: 'https://mexico.editoriallarueca.com/resolved-book',
              },
            ],
          },
          {
            channel: { slug: 'amazon', name: 'Amazon' },
            options: [
              {
                marketName: null,
                countryCode: null,
                url: 'https://amazon.example/resolved-book',
              },
            ],
          },
        ]}
      />,
    );

    expect(html).toContain('https://mexico.editoriallarueca.com/resolved-book');
    expect(html).toContain('https://amazon.example/resolved-book');
  });
});
