import { describe, expect, it } from 'vitest';

import { createPilotImageFailureIssue } from './apply';
import { getAttachmentFilenameSignal, planPilotMigration } from './planner';
import type {
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotManifest,
  PilotRelationshipCandidate,
} from './types';

function createAuthorCandidate(
  overrides: Partial<PilotAuthorCandidate> = {},
): PilotAuthorCandidate {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    name: 'Almudena Test',
    normalizedName: 'almudena test',
    slug: 'almudena-test',
    normalizedSlug: 'almudena-test',
    oldUrl: 'https://example.com/autores/almudena-test/',
    rawReview: '<p>Biografia editorial</p>',
    plainTextPreview: 'Biografia editorial',
    bioCandidate: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/image.jpg',
    imageFieldId: '',
    imageFieldUrl: '',
    status: 'publish',
    classification: 'author_only_candidate',
    classificationReasons: 'Sin tf_libro',
    possibleDuplicateGroup: '',
    reviewLikelyType: 'author_bio',
    reviewConfidence: 'high',
    yoastMetaTitle: '',
    yoastMetaDescription: '',
    canonicalUrl: '',
    ...overrides,
  };
}

function createBookCandidate(overrides: Partial<PilotBookCandidate> = {}): PilotBookCandidate {
  return {
    candidateKey: 'book:1',
    sourceWpPostId: '1',
    title: 'Cruce de Pasos',
    normalizedTitle: 'cruce de pasos',
    sourceAuthorTitle: 'Almudena Test',
    sourceAuthorSlug: 'almudena-test',
    sourceOldUrl: 'https://example.com/autores/almudena-test/',
    rawReview: '<p>Sinopsis del libro</p>',
    plainTextPreview: 'Sinopsis del libro',
    videoId: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/cover.jpg',
    duplicateGroupId: '',
    ...overrides,
  };
}

function createRelationshipCandidate(
  overrides: Partial<PilotRelationshipCandidate> = {},
): PilotRelationshipCandidate {
  return {
    bookCandidateKey: 'book:1',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    confidence: 'high',
    reason: 'post autor + tf_libro',
    ...overrides,
  };
}

function createAuditData(overrides: Partial<PilotAuditData> = {}): PilotAuditData {
  return {
    sample: {
      generatedAt: '2026-07-19T00:00:00.000Z',
      cases: [
        {
          kind: 'legacy sencillo',
          reason: 'fixture',
          sourceWpPostId: '1',
          authorCandidateKey: 'author:1',
          bookCandidateKey: 'book:1',
          title: 'Cruce de Pasos',
        },
      ],
    },
    authors: [createAuthorCandidate()],
    books: [createBookCandidate()],
    relationships: [createRelationshipCandidate()],
    attachments: [
      {
        wpPostId: '10',
        title: 'Portada Cruce de Pasos',
        slug: 'portada-cruce-de-pasos',
        url: 'https://example.com/cover.jpg',
        parentId: '',
        mimeType: 'image/jpeg',
        width: '600',
        height: '900',
        attachedFile: 'portada-cruce-de-pasos.jpg',
      },
    ],
    issues: [],
    decisions: {},
    ...overrides,
  };
}

describe('planPilotMigration', () => {
  it('treats Foto-style filenames as author-photo signals', () => {
    expect(
      getAttachmentFilenameSignal({
        attachedFile: 'FotoCharlin.jpg',
        title: 'FotoCharlin',
        slug: 'fotocharlin',
      }),
    ).toBe('author_photo');
  });

  it('does not classify a legacy _thumbnail_id as a safe book cover by default', () => {
    const plan = planPilotMigration(
      createAuditData({
        attachments: [
          {
            wpPostId: '10',
            title: 'Imagen sin contexto',
            slug: 'imagen-sin-contexto',
            url: 'https://example.com/image.jpg',
            parentId: '',
            mimeType: 'image/jpeg',
            width: '600',
            height: '900',
            attachedFile: 'image.jpg',
          },
        ],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.books[0]?.image).toMatchObject({
      role: 'ambiguous',
      status: 'skipped',
    });
  });

  it('does not assign an author photo filename to a book cover', () => {
    const plan = planPilotMigration(
      createAuditData({
        attachments: [
          {
            wpPostId: '10',
            title: 'FotoAngel',
            slug: 'fotoangel',
            url: 'https://example.com/FotoAngel.jpg',
            parentId: '',
            mimeType: 'image/jpeg',
            width: '400',
            height: '451',
            attachedFile: 'FotoAngel.jpg',
          },
        ],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.books[0]?.image).toMatchObject({
      role: 'ambiguous',
      status: 'skipped',
      reason: expect.stringContaining('foto de autor'),
    });
  });

  it('keeps a portrait book-cover filename eligible as a safe cover', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.books[0]?.image).toMatchObject({
      role: 'safe_book_cover',
      status: 'planned',
    });
  });

  it('builds a dry-run plan without applied manifest entries', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.mode).toBe('dry-run');
    expect(plan.authors).toHaveLength(1);
    expect(plan.books).toHaveLength(1);
    expect(plan.manifest.entries.every((entry) => entry.status !== 'applied')).toBe(true);
  });

  it('maps modern author candidates with biography and unpublished status', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.authors[0]?.input.biography).toBe('<p>Biografia editorial</p>');
    expect(plan.authors[0]?.input.isPublished).toBe(false);
    expect(plan.authors[0]?.input.isFeatured).toBe(false);
  });

  it('keeps legacy author review out of biography', () => {
    const plan = planPilotMigration(
      createAuditData({
        authors: [
          createAuthorCandidate({
            classification: 'legacy_author_book_combined',
            reviewLikelyType: 'book_synopsis',
          }),
        ],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.authors[0]?.input.biography).toBeNull();
  });

  it('blocks duplicate book groups without a manual decision', () => {
    const plan = planPilotMigration(
      createAuditData({
        books: [createBookCandidate({ duplicateGroupId: 'duplicate-book-title-1' })],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.books[0]?.status).toBe('blocked');
    expect(plan.issues.some((issue) => issue.code === 'DUPLICATE_BOOK_REQUIRES_DECISION')).toBe(
      true,
    );
  });

  it('keeps duplicate authors separate unless their slugs conflict', () => {
    const plan = planPilotMigration(
      createAuditData({
        sample: {
          generatedAt: '2026-07-19T00:00:00.000Z',
          cases: [
            {
              kind: 'author duplicate',
              reason: 'fixture',
              sourceWpPostId: '1',
              authorCandidateKey: 'author:1',
              title: 'Almudena Test',
            },
            {
              kind: 'author duplicate',
              reason: 'fixture',
              sourceWpPostId: '2',
              authorCandidateKey: 'author:2',
              title: 'Almudena Test 2',
            },
          ],
        },
        authors: [
          createAuthorCandidate({ candidateKey: 'author:1', possibleDuplicateGroup: 'dup-1' }),
          createAuthorCandidate({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            name: 'Almudena Test 2',
            slug: 'almudena-test-2',
            possibleDuplicateGroup: 'dup-1',
          }),
        ],
        books: [],
        relationships: [],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.authors.every((author) => author.status === 'planned')).toBe(true);
  });

  it('blocks author slug conflicts inside the pilot sample', () => {
    const plan = planPilotMigration(
      createAuditData({
        sample: {
          generatedAt: '2026-07-19T00:00:00.000Z',
          cases: [
            {
              kind: 'slug conflict',
              reason: 'fixture',
              sourceWpPostId: '1',
              authorCandidateKey: 'author:1',
              title: 'Almudena Test',
            },
            {
              kind: 'slug conflict',
              reason: 'fixture',
              sourceWpPostId: '2',
              authorCandidateKey: 'author:2',
              title: 'Almudena Test Clone',
            },
          ],
        },
        authors: [
          createAuthorCandidate({ candidateKey: 'author:1' }),
          createAuthorCandidate({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            name: 'Almudena Test Clone',
            slug: 'almudena-test',
          }),
        ],
        books: [],
        relationships: [],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.authors.every((author) => author.status === 'blocked')).toBe(true);
    expect(plan.issues.some((issue) => issue.code === 'AUTHOR_SLUG_CONFLICT_IN_PILOT')).toBe(true);
  });

  it('plans only high-confidence relationships automatically', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.relations[0]).toMatchObject({
      confidence: 'high',
      status: 'planned',
    });
  });

  it('blocks lower-confidence relationships', () => {
    const plan = planPilotMigration(
      createAuditData({
        relationships: [createRelationshipCandidate({ confidence: 'medium' })],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.relations[0]?.status).toBe('blocked');
    expect(plan.issues.some((issue) => issue.code === 'LOW_CONFIDENCE_RELATION_BLOCKED')).toBe(
      true,
    );
  });

  it('skips ambiguous images for manual review', () => {
    const plan = planPilotMigration(
      createAuditData({
        authors: [
          createAuthorCandidate({
            imageFieldId: '11',
            imageFieldUrl: 'https://example.com/another.jpg',
          }),
        ],
      }),
      {
        auditSource: './migration/audit',
      },
    );

    expect(plan.authors[0]?.image.status).toBe('skipped');
    expect(plan.authors[0]?.image.role).toBe('ambiguous');
  });

  it('plans safe author and book images', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'safe_author_photo', status: 'planned' }),
        expect.objectContaining({ role: 'safe_book_cover', status: 'planned' }),
      ]),
    );
  });

  it('creates a placeholder edition for each pilot book', () => {
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });

    expect(plan.editions[0]).toMatchObject({
      format: 'paperback',
      editionLabel: 'Datos pendientes de revisión',
      inferredEdition: true,
      status: 'planned',
    });
    expect(plan.books[0]?.input.editions[0]?.sortOrder).toBe(0);
  });

  it('preserves existing manifest entities as applied for idempotency', () => {
    const existingManifest: PilotManifest = {
      generatedAt: '2026-07-19T00:00:00.000Z',
      auditSource: './migration/audit',
      entries: [
        {
          sourceType: 'author',
          sourceWpPostId: '1',
          candidateKey: 'author:1',
          targetEntityType: 'authors',
          targetId: '00000000-0000-4000-8000-000000000001',
          status: 'applied',
          warnings: [],
          sourceMetadata: {},
          imageStatus: 'not_applicable',
          createdAt: '2026-07-19T00:00:00.000Z',
        },
      ],
    };
    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
      existingManifest,
    });

    expect(plan.manifest.entries.find((entry) => entry.sourceType === 'author')).toMatchObject({
      status: 'applied',
      targetId: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('preserves manual image failures without a targetId', () => {
    const basePlan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
    });
    const existingManifest: PilotManifest = {
      ...basePlan.manifest,
      entries: basePlan.manifest.entries.map((entry) =>
        entry.sourceType === 'image'
          ? {
              ...entry,
              status: 'skipped',
              imageStatus: 'manual_action_required',
              checkpoint: 'manual_action_required',
              sourceMetadata: {
                ...entry.sourceMetadata,
                migrationErrorCode: 'IMAGE_TOO_LARGE',
                retryable: false,
              },
            }
          : entry,
      ),
    };

    const plan = planPilotMigration(createAuditData(), {
      auditSource: './migration/audit',
      existingManifest,
    });

    expect(plan.manifest.entries.find((entry) => entry.sourceType === 'image')).toMatchObject({
      status: 'skipped',
      imageStatus: 'manual_action_required',
      checkpoint: 'manual_action_required',
      sourceMetadata: expect.objectContaining({
        migrationErrorCode: 'IMAGE_TOO_LARGE',
        retryable: false,
      }),
    });
  });

  it('creates a sanitized partial image failure issue', () => {
    const issue = createPilotImageFailureIssue('book:1', '1', new Error('SDK failure'));

    expect(issue).toMatchObject({
      severity: 'warning',
      code: 'PILOT_IMAGE_FAILED',
      candidateKey: 'book:1',
      sourceWpPostId: '1',
    });
  });
});
