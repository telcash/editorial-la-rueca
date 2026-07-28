import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'src/app/(public)/libros/[slug]/page.tsx'),
  'utf8',
);

describe('public book detail page composition', () => {
  it('keeps the route as a server composition over BookService data', () => {
    expect(pageSource).toContain('BookService.getPublishedBookBySlug');
    expect(pageSource).toContain('BookService.listRelatedPublishedBooksByAuthorIds');
    expect(pageSource).toContain('<BookDetailHero');
    expect(pageSource).toContain('<BookEditionsSection');
    expect(pageSource).toContain('<BookRelatedSection');
  });

  it('keeps inline cover and edition cards extracted from the route file', () => {
    expect(pageSource).not.toContain('function BookCover');
    expect(pageSource).not.toContain('function EditionCard');
    expect(pageSource).toContain('title="Sinopsis"');
    expect(pageSource).toContain('title="Ficha editorial"');
  });
});
