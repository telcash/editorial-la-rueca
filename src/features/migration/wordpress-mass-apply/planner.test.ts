import { describe, expect, it } from 'vitest';

import { planMassApply } from './planner';
import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassRelationPlan,
} from '@/features/migration/wordpress-mass/types';
import type { PilotManifest } from '@/features/migration/wordpress-pilot/types';

function createAuthor(overrides: Partial<MassAuthorPlan> = {}): MassAuthorPlan {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      name: 'Autora Uno',
      slug: 'autora-uno',
      shortBio: null,
      biography: null,
      photoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      country: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {
      possibleDuplicateGroup: null,
      oldUrl: 'https://example.com/autor/autora-uno/',
    },
    ...overrides,
  };
}

function createBook(overrides: Partial<MassBookPlan> = {}): MassBookPlan {
  return {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      title: 'Libro Uno',
      subtitle: null,
      slug: 'libro-uno',
      description: null,
      excerpt: null,
      coverUrl: null,
      originalPublicationDate: null,
      language: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      authorIds: ['00000000-0000-4000-8000-000000000001'],
      categoryIds: [],
      editions: [],
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {},
    ...overrides,
  };
}

function createRelation(overrides: Partial<MassRelationPlan> = {}): MassRelationPlan {
  return {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    confidence: 'high',
    reason: 'fixture',
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    ...overrides,
  };
}

function createAuthorImage(overrides: Partial<MassAuthorImagePlan> = {}): MassAuthorImagePlan {
  return {
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'foto.jpg',
    url: 'https://example.com/foto.jpg',
    status: 'AUTO_UPLOAD',
    confidence: 'high',
    score: 90,
    reasons: ['fixture'],
    ...overrides,
  };
}

function createCover(overrides: Partial<MassBookCoverPlan> = {}): MassBookCoverPlan {
  return {
    bookCandidateKey: 'book:uno',
    sourceWpPostId: '1',
    attachmentId: '20',
    filename: 'cover.jpg',
    url: 'https://example.com/cover.jpg',
    score: 110,
    confidence: 'high',
    status: 'AUTO_UPLOAD_CANDIDATE',
    reasons: ['filename contiene titulo'],
    ...overrides,
  };
}

function createPilotManifest(): PilotManifest {
  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    auditSource: './migration/audit',
    entries: [
      {
        sourceType: 'author',
        sourceWpPostId: '1',
        candidateKey: 'author:1',
        targetEntityType: 'authors',
        targetId: '11111111-1111-4111-8111-111111111111',
        status: 'applied',
        warnings: [],
        sourceMetadata: {},
        imageStatus: 'skipped',
        checkpoint: 'complete',
        createdAt: '2026-07-23T00:00:00.000Z',
      },
      {
        sourceType: 'book',
        sourceWpPostId: '1',
        candidateKey: 'book:uno',
        targetEntityType: 'books',
        targetId: '22222222-2222-4222-8222-222222222222',
        status: 'applied',
        warnings: [],
        sourceMetadata: {},
        imageStatus: 'skipped',
        checkpoint: 'complete',
        createdAt: '2026-07-23T00:00:00.000Z',
      },
    ],
  };
}

function createPlanInput(
  overrides: {
    authors?: MassAuthorPlan[];
    books?: MassBookPlan[];
    relations?: MassRelationPlan[];
    authorImages?: MassAuthorImagePlan[];
    bookCovers?: MassBookCoverPlan[];
    pilotManifest?: PilotManifest | null;
    batchSize?: number;
  } = {},
) {
  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    batchSize: overrides.batchSize,
    authors: overrides.authors ?? [createAuthor()],
    books: overrides.books ?? [createBook()],
    relations: overrides.relations ?? [createRelation()],
    authorImages: overrides.authorImages ?? [createAuthorImage()],
    bookCovers: overrides.bookCovers ?? [createCover()],
    pilotManifest: overrides.pilotManifest,
  };
}

describe('planMassApply', () => {
  it('preserves duplicate authors separately and uses deterministic legacy slugs on collision', () => {
    const plan = planMassApply(
      createPlanInput({
        authors: [
          createAuthor({
            candidateKey: 'author:1',
            sourceWpPostId: '1',
            sourceMetadata: { possibleDuplicateGroup: 'possible-author:uno' },
          }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, slug: 'autora-uno' },
            sourceMetadata: { possibleDuplicateGroup: 'possible-author:uno' },
          }),
        ],
      }),
    );

    expect(plan.authors).toHaveLength(2);
    expect(plan.authors.every((author) => author.needsAuthorDeduplication)).toBe(true);
    expect(plan.authors.map((author) => author.resolvedSlug)).toEqual([
      'autora-uno-wp-1',
      'autora-uno-wp-2',
    ]);
  });

  it('reuses pilot authors and books and excludes them from destructive rollback', () => {
    const plan = planMassApply(createPlanInput({ pilotManifest: createPilotManifest() }));

    expect(plan.authors[0]?.action).toBe('REUSE_PILOT');
    expect(plan.books[0]?.action).toBe('REUSE_PILOT');
    expect(plan.rollbackPlan.resources.authors[0]?.preexisting).toBe(true);
    expect(plan.rollbackPlan.resources.books[0]?.preexisting).toBe(true);
  });

  it('skips book:r without blocking the rest of the catalog', () => {
    const plan = planMassApply(
      createPlanInput({
        books: [
          createBook(),
          createBook({
            candidateKey: 'book:r',
            sourceWpPostId: '1376',
            input: { ...createBook().input, title: 'R', slug: 'r', sortOrder: 1 },
          }),
        ],
      }),
    );

    expect(plan.books.find((book) => book.candidateKey === 'book:r')).toMatchObject({
      status: 'SKIPPED',
      action: 'SKIP',
      blockingReasons: ['INVALID_OR_UNVERIFIED_TITLE'],
    });
    expect(plan.summary.booksToCreate).toBe(1);
  });

  it('makes relations to duplicate authors migratable and deduplicates exact duplicates', () => {
    const relation = createRelation({
      action: 'BLOCKED',
      status: 'BLOCKED',
      blockingReasons: ['Autor relacionado no tiene mapping READY.'],
    });
    const plan = planMassApply(
      createPlanInput({
        authors: [
          createAuthor({
            sourceMetadata: { possibleDuplicateGroup: 'possible-author:uno' },
          }),
        ],
        relations: [relation, relation],
      }),
    );

    expect(plan.relations[0]?.status).toBe('READY');
    expect(plan.relations[1]?.action).toBe('SKIP');
  });

  it('creates inferred editions without inventing ISBN price pages or date', () => {
    const plan = planMassApply(createPlanInput());

    expect(plan.editions[0]).toMatchObject({
      inferredEdition: true,
      edition: {
        format: 'paperback',
        editionLabel: 'Datos pendientes de revisión',
        isbn10: null,
        isbn13: null,
        price: null,
        pages: null,
        publicationDate: null,
      },
    });
  });

  it('plans high-confidence covers only and leaves medium covers for manual review', () => {
    const high = planMassApply(createPlanInput());

    expect(high.bookCovers[0]?.status).toBe('READY');

    const medium = planMassApply(
      createPlanInput({
        bookCovers: [createCover({ confidence: 'medium', status: 'MANUAL_REVIEW' })],
      }),
    );

    expect(medium.bookCovers[0]?.action).toBe('MANUAL_REVIEW');
  });

  it('keeps image failures nonfatal by classifying non-ready images as manual', () => {
    const plan = planMassApply(
      createPlanInput({
        authorImages: [createAuthorImage({ status: 'MANUAL_REVIEW', confidence: 'low' })],
      }),
    );

    expect(plan.authorImages[0]?.action).toBe('MANUAL_REVIEW');
    expect(plan.summary.blockers).toBe(1);
  });

  it('creates resumable batches and keeps rerun identifiers stable', () => {
    const first = planMassApply(
      createPlanInput({
        batchSize: 1,
        authors: [
          createAuthor({ candidateKey: 'author:1' }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, name: 'Autora Dos', slug: 'autora-dos' },
          }),
        ],
      }),
    );
    const second = planMassApply(
      createPlanInput({
        batchSize: 1,
        authors: [
          createAuthor({ candidateKey: 'author:1' }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, name: 'Autora Dos', slug: 'autora-dos' },
          }),
        ],
      }),
    );

    expect(first.batches.length).toBeGreaterThan(1);
    expect(first.manifest.entries.map((entry) => entry.candidateKey)).toEqual(
      second.manifest.entries.map((entry) => entry.candidateKey),
    );
  });
});
