import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Author } from '@/db/schema';
import { AuthorCard } from './author-card';

const projectRoot = process.cwd();

const author: Author = {
  id: '07db599d-dfe8-42fd-b52b-03791f17acfd',
  name: 'Almudena Mestre',
  slug: 'almudena-mestre',
  shortBio: 'Editora y autora acompañada por Editorial La Rueca.',
  biography: null,
  photoUrl: 'https://example.com/almudena.jpg',
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: 'España',
  isFeatured: true,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

describe('AuthorCard', () => {
  it('renders the author name and keeps the complete card accessible', () => {
    const html = renderToStaticMarkup(<AuthorCard author={author} />);

    expect(html).toContain('Almudena Mestre');
    expect(html).toContain('href="/autores/almudena-mestre"');
    expect(html).toContain('alt="Foto de Almudena Mestre"');
  });

  it('uses compact uniform image and information areas without forced uppercase names', () => {
    const html = renderToStaticMarkup(<AuthorCard author={author} />);

    expect(html).toContain('data-author-card-image="true"');
    expect(html).toContain('aspect-[4/3]');
    expect(html).toContain('data-author-card-info="true"');
    expect(html).toContain('h-[9.5rem]');
    expect(html).toContain('h-11');
    expect(html).toContain('h-10');
    expect(html).toContain('text-lg');
    expect(html).toContain('line-clamp-2');
    expect(html).toContain('mt-auto');
    expect(html).not.toContain('uppercase');
  });

  it('keeps author images lazy by default and prioritizes only when requested', () => {
    const defaultHtml = renderToStaticMarkup(<AuthorCard author={author} />);
    const priorityHtml = renderToStaticMarkup(<AuthorCard author={author} imagePriority />);

    expect(defaultHtml).not.toContain('rel="preload"');
    expect(priorityHtml).toContain('rel="preload"');
  });

  it('is reused by Home and the public authors index', () => {
    const homePage = readFileSync(join(projectRoot, 'src/app/(public)/page.tsx'), 'utf8');
    const authorsPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/page.tsx'),
      'utf8',
    );

    expect(homePage).toContain('<FeaturedAuthorsCarousel');
    expect(authorsPage).toContain('<AuthorCard');
    expect(homePage).not.toContain('HomeAuthorCard');
    expect(authorsPage).not.toContain('AuthorsPageAuthorCard');
  });

  it('keeps the compact authors grid while preserving search and pagination on /autores', () => {
    const homePage = readFileSync(join(projectRoot, 'src/app/(public)/page.tsx'), 'utf8');
    const authorsPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/page.tsx'),
      'utf8',
    );

    expect(homePage).toContain('<FeaturedAuthorsCarousel');
    expect(homePage).toContain('firstImagePriority');
    expect(authorsPage).toContain('md:grid-cols-[repeat(3,13.75rem)]');
    expect(authorsPage).toContain('xl:grid-cols-[repeat(5,14rem)]');
    expect(authorsPage).toContain('<PublicSearchForm');
    expect(authorsPage).toContain('<PublicPagination');
    expect(authorsPage).toContain('pageSize: PUBLIC_AUTHORS_PAGE_SIZE');
    expect(authorsPage).not.toContain('pageSize: 12');
    expect(authorsPage).not.toContain('pageSize: 20');
  });

  it('keeps the author detail photo compact and before the text content', () => {
    const authorDetailPage = readFileSync(
      join(projectRoot, 'src/app/(public)/autores/[slug]/page.tsx'),
      'utf8',
    );

    expect(authorDetailPage).toContain('data-author-detail-photo="true"');
    expect(authorDetailPage).toContain('w-[72%]');
    expect(authorDetailPage).toContain('max-w-[18rem]');
    expect(authorDetailPage).toContain('lg:grid-cols-[minmax(14rem,18rem)_1fr]');
    expect(authorDetailPage.indexOf('<AuthorPhoto name={author.name}')).toBeLessThan(
      authorDetailPage.indexOf('{author.country ?'),
    );
  });

  it('does not modify the public BookCard implementation', () => {
    const bookCard = readFileSync(join(projectRoot, 'src/components/public/book-card.tsx'), 'utf8');

    expect(bookCard).toContain('BOOK_CARD_WIDTH');
    expect(bookCard).toContain('export function BookCard');
  });
});
