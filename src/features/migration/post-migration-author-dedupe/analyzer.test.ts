import { describe, expect, it } from 'vitest';

import { buildAuthorDedupeAudit } from './analyzer';
import { getSlugNumericSuffix, normalizeAuthorName, normalizeSlugBase } from './normalize';
import type { AuthorDedupeSourceAuthor } from './types';

const baseAuthor: AuthorDedupeSourceAuthor = {
  id: 'author-1',
  name: 'Ana Córdoba del Campo',
  slug: 'ana-cordoba-del-campo',
  shortBio: null,
  biography: null,
  photoUrl: null,
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: null,
  isPublished: true,
  isFeatured: false,
  isArchived: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  books: [
    {
      bookId: 'book-1',
      title: 'Cruce de Pasos',
      slug: 'cruce-de-pasos',
      isPublished: true,
      isArchived: false,
    },
  ],
};

describe('post-migration author dedupe analyzer', () => {
  it('normalizes names and slug suffixes only for comparison', () => {
    expect(normalizeAuthorName('  ANA  Córdoba-del Campo!! ')).toBe('ana cordoba del campo');
    expect(normalizeSlugBase('ana-cordoba-del-campo-3')).toBe('ana-cordoba-del-campo');
    expect(getSlugNumericSuffix('ana-cordoba-del-campo-3')).toBe(3);
    expect(getSlugNumericSuffix('ana-cordoba-del-campo')).toBeNull();
  });

  it('detects high confidence duplicates from matching names and numbered slugs', () => {
    const audit = buildAuthorDedupeAudit(
      [
        baseAuthor,
        {
          ...baseAuthor,
          id: 'author-2',
          slug: 'ana-cordoba-del-campo-2',
          books: [
            {
              bookId: 'book-2',
              title: 'Segundo libro',
              slug: 'segundo-libro',
              isPublished: true,
              isArchived: false,
            },
          ],
        },
      ],
      '2026-08-11T00:00:00.000Z',
    );

    expect(audit.summary.duplicateGroupsDetected).toBe(1);
    expect(audit.summary.highConfidenceDuplicate).toBe(1);
    expect(audit.groups[0].canonicalAuthorId).toBe('author-1');
    expect(audit.groups[0].relationSimulation.proposedFinal).toHaveLength(2);
  });

  it('marks metadata differences as conflicts and lowers confidence', () => {
    const audit = buildAuthorDedupeAudit(
      [
        { ...baseAuthor, photoUrl: 'https://example.com/ana-1.jpg' },
        {
          ...baseAuthor,
          id: 'author-2',
          slug: 'ana-cordoba-del-campo-2',
          photoUrl: 'https://example.com/ana-2.jpg',
          biography: 'Una biografía distinta.',
          books: [],
        },
      ],
      '2026-08-11T00:00:00.000Z',
    );

    expect(audit.groups[0].classification).toBe('LIKELY_DUPLICATE');
    expect(audit.groups[0].conflicts).toContain('photoUrl');
    expect(
      audit.groups[0].fieldProposals.find((field) => field.field === 'biography'),
    ).toMatchObject({
      conflict: false,
    });
  });

  it('simulates duplicate relation consolidation without writing data', () => {
    const duplicateBook = {
      bookId: 'book-1',
      title: 'Cruce de Pasos',
      slug: 'cruce-de-pasos',
      isPublished: true,
      isArchived: false,
    };
    const audit = buildAuthorDedupeAudit(
      [
        { ...baseAuthor, books: [duplicateBook] },
        {
          ...baseAuthor,
          id: 'author-2',
          slug: 'ana-cordoba-del-campo-2',
          books: [duplicateBook],
        },
      ],
      '2026-08-11T00:00:00.000Z',
    );

    expect(audit.groups[0].relationSimulation.current).toHaveLength(2);
    expect(audit.groups[0].relationSimulation.proposedFinal).toHaveLength(1);
    expect(audit.groups[0].relationSimulation.duplicateRelationsToSkip).toHaveLength(1);
  });
});
