import { describe, expect, it } from 'vitest';

import { planMassMigration } from './planner';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotRelationshipCandidate,
} from '@/features/migration/wordpress-pilot/types';

function createAuthor(overrides: Partial<PilotAuthorCandidate> = {}): PilotAuthorCandidate {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    name: 'Autora Uno',
    normalizedName: 'autora uno',
    slug: 'autora-uno',
    normalizedSlug: 'autora-uno',
    oldUrl: 'https://example.com/autor/autora-uno/',
    rawReview: '<p>Bio</p>',
    plainTextPreview: 'Bio',
    bioCandidate: '',
    thumbnailId: '',
    thumbnailUrl: '',
    imageFieldId: '',
    imageFieldUrl: '',
    status: 'publish',
    classification: 'author_only_candidate',
    classificationReasons: '',
    possibleDuplicateGroup: '',
    reviewLikelyType: 'author_bio',
    reviewConfidence: 'medium',
    yoastMetaTitle: '',
    yoastMetaDescription: 'Meta autora',
    canonicalUrl: '',
    ...overrides,
  };
}

function createBook(overrides: Partial<PilotBookCandidate> = {}): PilotBookCandidate {
  return {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    title: 'Libro Uno',
    normalizedTitle: 'libro uno',
    sourceAuthorTitle: 'Autora Uno',
    sourceAuthorSlug: 'autora-uno',
    sourceOldUrl: 'https://example.com/autor/autora-uno/',
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    videoId: 'abc',
    thumbnailId: '',
    thumbnailUrl: '',
    duplicateGroupId: '',
    ...overrides,
  };
}

function createRelation(
  overrides: Partial<PilotRelationshipCandidate> = {},
): PilotRelationshipCandidate {
  return {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    confidence: 'high',
    reason: 'fixture',
    ...overrides,
  };
}

function createAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '10',
    title: 'Foto Autora Uno',
    slug: 'foto-autora-uno',
    url: 'https://example.com/foto-autora-uno.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '600',
    height: '600',
    attachedFile: 'foto-autora-uno.jpg',
    ...overrides,
  };
}

function createData(overrides: Partial<PilotAuditData> = {}): PilotAuditData {
  return {
    sample: {
      generatedAt: '2026-07-23T00:00:00.000Z',
      cases: [],
    },
    authors: [createAuthor()],
    books: [createBook()],
    relationships: [createRelation()],
    attachments: [],
    issues: [],
    decisions: {},
    ...overrides,
  };
}

function createCoverMatch(overrides: Record<string, unknown> = {}) {
  return {
    bookCandidateKey: 'book:uno',
    bookTitle: 'Libro Uno',
    bestCandidate: null,
    confidence: 'none' as const,
    alternatives: [],
    reasons: [],
    ...overrides,
  };
}

describe('planMassMigration', () => {
  it('marks a simple author as READY and keeps metadata outside schema input', () => {
    const plan = planMassMigration({
      data: createData(),
      bookCoverBestMatches: [],
      generatedAt: '2026-07-23T00:00:00.000Z',
    });

    expect(plan.authors[0]).toMatchObject({
      status: 'READY',
      action: 'AUTO_CREATE',
    });
    expect(plan.authors[0]?.input).not.toHaveProperty('rawReview');
    expect(plan.authors[0]?.sourceMetadata.rawReview).toBe('<p>Bio</p>');
  });

  it('blocks unresolved author duplicates', () => {
    const plan = planMassMigration({
      data: createData({
        authors: [
          createAuthor({ candidateKey: 'author:1', possibleDuplicateGroup: 'dup-author:uno' }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            slug: 'autora-dos',
            possibleDuplicateGroup: 'dup-author:uno',
          }),
        ],
      }),
      bookCoverBestMatches: [],
    });

    expect(plan.authors.every((author) => author.status === 'BLOCKED')).toBe(true);
    expect(plan.conflicts.some((conflict) => conflict.code === 'DUPLICATE_AUTHOR_UNRESOLVED')).toBe(
      true,
    );
  });

  it('marks a simple book as READY with an inferred edition', () => {
    const plan = planMassMigration({
      data: createData(),
      bookCoverBestMatches: [],
    });

    expect(plan.books[0]?.status).toBe('READY');
    expect(plan.books[0]?.input.isPublished).toBe(false);
    expect(plan.books[0]?.input.categoryIds).toEqual([]);
    expect(plan.editions[0]).toMatchObject({
      status: 'READY',
      inferredEdition: true,
      isbn13: null,
      price: null,
    });
  });

  it('blocks unresolved duplicate books but applies the Cruce de Pasos known decision', () => {
    const unresolved = planMassMigration({
      data: createData({
        books: [
          createBook({ candidateKey: 'book:a', duplicateGroupId: 'duplicate-book:a' }),
          createBook({
            candidateKey: 'book:b',
            title: 'Libro B',
            duplicateGroupId: 'duplicate-book:a',
          }),
        ],
      }),
      bookCoverBestMatches: [],
    });

    expect(unresolved.books.every((book) => book.status === 'BLOCKED')).toBe(true);

    const cruce = planMassMigration({
      data: createData({
        books: [
          createBook({
            candidateKey: 'book:cruce de pasos',
            title: 'Cruce de Pasos',
            duplicateGroupId: 'duplicate-book:cruce de pasos',
          }),
          createBook({
            candidateKey: 'book:cruce de pasos',
            title: 'Cruce de Pasos',
            duplicateGroupId: 'duplicate-book:cruce de pasos',
          }),
        ],
        decisions: {
          bookDuplicateGroups: {
            'duplicate-book:cruce de pasos': {
              action: 'merge',
              canonicalCandidateKey: 'book:cruce de pasos',
              mergeAuthorRelations: true,
            },
          },
        },
      }),
      bookCoverBestMatches: [],
    });

    expect(cruce.books).toHaveLength(1);
    expect(cruce.books[0]?.status).toBe('READY');
  });

  it('classifies high relations as auto and low relations as manual', () => {
    const plan = planMassMigration({
      data: createData({
        relationships: [
          createRelation({ confidence: 'high' }),
          createRelation({ bookCandidateKey: 'book:uno', confidence: 'low' }),
        ],
      }),
      bookCoverBestMatches: [],
    });

    expect(plan.summary.relations.auto).toBe(1);
    expect(plan.summary.relations.manual).toBe(1);
  });

  it('classifies thumbnail author photos and oversized image metadata', () => {
    const safe = planMassMigration({
      data: createData({
        authors: [createAuthor({ thumbnailId: '10' })],
        attachments: [createAttachment()],
      }),
      bookCoverBestMatches: [],
    });

    expect(safe.authorImages[0]?.status).toBe('AUTO_UPLOAD');

    const tooLarge = planMassMigration({
      data: createData({
        authors: [createAuthor({ thumbnailId: '11' })],
        attachments: [
          createAttachment({
            wpPostId: '11',
            fileSizeBytes: String(6 * 1024 * 1024),
          } as Partial<PilotAttachmentCandidate>),
        ],
      }),
      bookCoverBestMatches: [],
    });

    expect(tooLarge.authorImages[0]?.status).toBe('TOO_LARGE');
  });

  it('classifies book covers by confidence and null best match', () => {
    const high = createCoverMatch({
      bestCandidate: {
        attachmentId: '20',
        attachmentUrl: 'https://example.com/cover.jpg',
        filename: 'cover.jpg',
        score: 90,
        confidence: 'high',
        reasons: 'filename contiene el titulo del libro',
      },
      confidence: 'high',
    });
    const medium = createCoverMatch({
      bookCandidateKey: 'book:dos',
      bestCandidate: {
        attachmentId: '21',
        attachmentUrl: 'https://example.com/cover-2.jpg',
        filename: 'cover-2.jpg',
        score: 55,
        confidence: 'medium',
        reasons: 'senal media',
      },
      confidence: 'medium',
    });
    const plan = planMassMigration({
      data: createData({
        books: [createBook(), createBook({ candidateKey: 'book:dos', title: 'Libro Dos' })],
      }),
      bookCoverBestMatches: [high, medium],
    });

    expect(plan.bookCovers.map((cover) => cover.status)).toEqual([
      'AUTO_UPLOAD_CANDIDATE',
      'MANUAL_REVIEW',
    ]);

    const none = planMassMigration({
      data: createData(),
      bookCoverBestMatches: [createCoverMatch()],
    });

    expect(none.bookCovers[0]?.status).toBe('NO_COVER');
  });

  it('detects slug conflicts and produces summary counts', () => {
    const plan = planMassMigration({
      data: createData({
        authors: [
          createAuthor({ candidateKey: 'author:1', slug: 'misma' }),
          createAuthor({ candidateKey: 'author:2', sourceWpPostId: '2', slug: 'misma' }),
        ],
      }),
      bookCoverBestMatches: [],
    });

    expect(plan.conflicts.some((conflict) => conflict.code === 'INTERNAL_SLUG_CONFLICT')).toBe(
      true,
    );
    expect(plan.summary.authors.totalCandidates).toBe(2);
    expect(plan.summary.blockers).toBeGreaterThan(0);
    expect(plan.redirects.length).toBeGreaterThan(0);
  });
});
