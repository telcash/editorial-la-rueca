import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Author } from '@/db/schema';
import { FeaturedAuthorsCarousel } from './featured-authors-carousel';

const projectRoot = process.cwd();

function createAuthor(index: number): Author {
  return {
    id: `07db599d-dfe8-42fd-b52b-03791f17acf${index}`,
    name: `Autora ${index}`,
    slug: `autora-${index}`,
    shortBio: `Bio de autora ${index}`,
    biography: null,
    photoUrl: null,
    websiteUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    country: null,
    isFeatured: true,
    isPublished: true,
    isArchived: false,
    archivedAt: null,
    sortOrder: index,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  };
}

describe('FeaturedAuthorsCarousel', () => {
  it('renders every author it receives using the shared AuthorCard', () => {
    const html = renderToStaticMarkup(
      <FeaturedAuthorsCarousel authors={[1, 2, 3, 4].map(createAuthor)} />,
    );

    expect(html).toContain('data-featured-authors-carousel="true"');
    expect(html).toContain('data-carousel-track="featured-authors"');
    expect(html.match(/data-carousel-slide="featured-author"/g)).toHaveLength(4);
    expect(html).toContain('Autora 1');
    expect(html).toContain('Autora 4');
    expect(html).toContain('Ver autor');
  });

  it('does not render an empty carousel when there are no featured authors', () => {
    const html = renderToStaticMarkup(<FeaturedAuthorsCarousel authors={[]} />);

    expect(html).toBe('');
  });

  it('uses accessible navigation without autoplay', () => {
    const html = renderToStaticMarkup(<FeaturedAuthorsCarousel authors={[createAuthor(1)]} />);
    const source = readFileSync(
      join(projectRoot, 'src/components/public/featured-authors-carousel.tsx'),
      'utf8',
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Autores destacados"');
    expect(html).toContain('aria-label="Autores anteriores"');
    expect(html).toContain('aria-label="Autores siguientes"');
    expect(html).toContain('disabled=""');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('autoplay');
  });

  it('keeps the compact approved AuthorCard dimensions across carousel breakpoints', () => {
    const html = renderToStaticMarkup(<FeaturedAuthorsCarousel authors={[createAuthor(1)]} />);

    expect(html).toContain('basis-[calc(100vw-32px)]');
    expect(html).toContain('max-w-[calc(100vw-32px)]');
    expect(html).toContain('[&amp;&gt;div]:w-full');
    expect(html).toContain('sm:basis-[13.75rem]');
    expect(html).toContain('sm:max-w-none');
    expect(html).toContain('lg:basis-[15rem]');
    expect(html).toContain('gap-3.5');
    expect(html).toContain('sm:gap-5');
    expect(html).toContain('lg:gap-6');
  });

  it('keeps the home section fetching all published authors and filtering featured authors without a fixed limit', () => {
    const homePage = readFileSync(join(projectRoot, 'src/app/(public)/page.tsx'), 'utf8');

    expect(homePage).toContain('AuthorService.listPublishedAuthors()');
    expect(homePage).toContain('author.isFeatured');
    expect(homePage).not.toContain('slice(0, 3)');
    expect(homePage).not.toContain('limit(3)');
    expect(homePage).toContain('<FeaturedAuthorsCarousel');
    expect(homePage).toContain('authors={featuredAuthors}');
    expect(homePage).toContain('firstImagePriority');
    expect(homePage).toContain('<PublicCtaLink href="/autores">Ver autores</PublicCtaLink>');
  });

  it('does not modify BookCard or the featured books carousel', () => {
    const bookCard = readFileSync(join(projectRoot, 'src/components/public/book-card.tsx'), 'utf8');
    const featuredBooksCarousel = readFileSync(
      join(projectRoot, 'src/components/public/featured-books-carousel.tsx'),
      'utf8',
    );

    expect(bookCard).toContain('export function BookCard');
    expect(featuredBooksCarousel).toContain('data-carousel-track="featured-books"');
  });
});
