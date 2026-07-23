import { describe, expect, it } from 'vitest';

import { createImageRepairPlan } from './image-repair';
import { createImageReviewSummary, renderImageReviewHtml } from './image-review';
import { planPilotMigration } from './planner';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotRelationshipCandidate,
} from './types';

function createAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '10',
    title: 'FotoAngel',
    slug: 'fotoangel',
    url: 'https://example.com/FotoAngel.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '400',
    height: '451',
    attachedFile: 'FotoAngel.jpg',
    ...overrides,
  };
}

function createAuthorCandidate(
  overrides: Partial<PilotAuthorCandidate> = {},
): PilotAuthorCandidate {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    name: 'Angel Test',
    normalizedName: 'angel test',
    slug: 'angel-test',
    normalizedSlug: 'angel-test',
    oldUrl: 'https://example.com/autor/angel-test/',
    rawReview: '',
    plainTextPreview: '',
    bioCandidate: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/FotoAngel.jpg',
    imageFieldId: '20',
    imageFieldUrl: 'https://example.com/mockup.jpg',
    status: 'publish',
    classification: 'legacy_author_book_combined',
    classificationReasons: 'tf_libro poblado',
    possibleDuplicateGroup: '',
    reviewLikelyType: 'book_synopsis',
    reviewConfidence: 'medium',
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
    title: 'Libro Uno',
    normalizedTitle: 'libro uno',
    sourceAuthorTitle: 'Angel Test',
    sourceAuthorSlug: 'angel-test',
    sourceOldUrl: 'https://example.com/autor/angel-test/',
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    videoId: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/FotoAngel.jpg',
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
      generatedAt: '2026-07-23T00:00:00.000Z',
      cases: [
        {
          kind: 'fixture',
          reason: 'fixture',
          sourceWpPostId: '1',
          authorCandidateKey: 'author:1',
          bookCandidateKey: 'book:1',
          title: 'Libro Uno',
        },
      ],
    },
    authors: [createAuthorCandidate()],
    books: [createBookCandidate()],
    relationships: [createRelationshipCandidate()],
    attachments: [
      createAttachment(),
      createAttachment({
        wpPostId: '20',
        title: 'Mockup Libro',
        slug: 'mockup-libro',
        url: 'https://example.com/mockup.jpg',
        width: '1200',
        height: '800',
        attachedFile: 'mockup-libro.jpg',
      }),
    ],
    issues: [],
    decisions: {},
    ...overrides,
  };
}

describe('image review', () => {
  it('groups visual review by the pilot legacy record', () => {
    const data = createAuditData();
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const repairPlan = createImageRepairPlan(data, plan, plan.manifest);
    const summary = createImageReviewSummary(data, plan, plan.manifest, repairPlan);

    expect(summary.records).toHaveLength(1);
    expect(summary.records[0]).toMatchObject({
      sourceWpPostId: '1',
      authorName: 'Angel Test',
      legacyBookTitle: 'Libro Uno',
      relatedBookCandidateKeys: ['book:1'],
    });
    expect(summary.records[0]?.images.map((image) => image.origin)).toEqual([
      '_thumbnail_id',
      'imagen_destacada_2',
    ]);
    expect(summary.secondaryImagePattern.conclusion).toBe('MIXED_USAGE');
  });

  it('includes current Supabase cover when it exists in manifest metadata', () => {
    const data = createAuditData();
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const manifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) =>
        entry.sourceType === 'image' && entry.candidateKey === 'book:1'
          ? {
              ...entry,
              sourceMetadata: {
                ...entry.sourceMetadata,
                role: 'safe_book_cover',
                resultingUrl: 'https://example.com/storage/current-cover.jpg',
              },
            }
          : entry,
      ),
    };
    const repairPlan = createImageRepairPlan(data, plan, manifest);
    const summary = createImageReviewSummary(data, plan, manifest, repairPlan);

    expect(summary.records[0]?.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          origin: 'current_supabase_cover',
          url: 'https://example.com/storage/current-cover.jpg',
        }),
      ]),
    );
  });

  it('renders a standalone html document', () => {
    const data = createAuditData();
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const repairPlan = createImageRepairPlan(data, plan, plan.manifest);
    const summary = createImageReviewSummary(data, plan, plan.manifest, repairPlan);

    expect(renderImageReviewHtml(summary)).toContain('<!doctype html>');
  });
});
