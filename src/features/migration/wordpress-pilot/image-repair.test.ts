import { describe, expect, it } from 'vitest';

import { createImageRepairPlan } from './image-repair';
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
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    bioCandidate: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/FotoAngel.jpg',
    imageFieldId: '',
    imageFieldUrl: '',
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
    attachments: [createAttachment()],
    issues: [],
    decisions: {},
    ...overrides,
  };
}

describe('createImageRepairPlan', () => {
  it('proposes clearing a wrong book cover when the source file is an author photo', () => {
    const data = createAuditData();
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const existingManifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) =>
        entry.sourceType === 'image' && entry.candidateKey === 'book:1'
          ? {
              ...entry,
              sourceMetadata: {
                ...entry.sourceMetadata,
                role: 'safe_book_cover',
              },
            }
          : entry,
      ),
    };
    const repairPlan = createImageRepairPlan(data, plan, existingManifest);

    expect(repairPlan.entries.find((entry) => entry.entityType === 'book')).toMatchObject({
      action: 'clear_wrong_book_cover',
      proposedRole: 'author_photo',
      confidence: 'high',
      proposedAttachmentId: '10',
    });
  });

  it('proposes setting an author photo from the same evidence', () => {
    const data = createAuditData();
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const repairPlan = createImageRepairPlan(data, plan, plan.manifest);

    expect(repairPlan.entries.find((entry) => entry.entityType === 'author')).toMatchObject({
      action: 'set_author_photo',
      proposedRole: 'author_photo',
      confidence: 'high',
      proposedAttachmentId: '10',
    });
  });

  it('does not include entities outside the pilot plan', () => {
    const data = createAuditData({
      authors: [
        createAuthorCandidate(),
        createAuthorCandidate({
          candidateKey: 'author:outside',
          sourceWpPostId: '2',
          name: 'Fuera',
          slug: 'fuera',
          normalizedSlug: 'fuera',
        }),
      ],
    });
    const plan = planPilotMigration(data, { auditSource: './migration/audit' });
    const repairPlan = createImageRepairPlan(data, plan, plan.manifest);

    expect(repairPlan.entries.map((entry) => entry.candidateKey)).not.toContain('author:outside');
  });
});
