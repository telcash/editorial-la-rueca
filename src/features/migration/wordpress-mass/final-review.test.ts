import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createFinalReview,
  createMassDecisionsReview,
  ensureNoFinalMassDecisions,
  orderGroupsForHumanReview,
  writeFinalReviewOutputs,
  type AuthorDuplicateReviewFile,
  type MassResolutionSimulationFile,
} from './final-review';
import type { AuthorDuplicateReviewGroup } from './resolution';

function createGroup(
  overrides: Partial<AuthorDuplicateReviewGroup> = {},
): AuthorDuplicateReviewGroup {
  return {
    groupId: 'possible-author:ana',
    proposal: 'MERGE_HIGH_CONFIDENCE',
    proposedAction: 'merge',
    canonicalCandidateKey: 'author:1',
    mergeCandidates: ['author:2'],
    confidence: 0.92,
    reasons: ['Nombre normalizado identico.'],
    fieldConflicts: [],
    photoClassification: 'SAME_IMAGE',
    canonicalPhoto: {
      authorCandidateKey: 'author:1',
      attachmentId: '10',
      url: 'https://example.com/foto-ana.jpg',
      confidence: 'high',
    },
    proposedMergedData: {
      name: 'Ana',
      slug: 'ana',
      photo: {
        authorCandidateKey: 'author:1',
      },
    },
    members: [
      {
        candidateKey: 'author:1',
        sourceWpPostId: '1',
        name: 'Ana',
        normalizedName: 'ana',
        slug: 'ana',
        oldUrl: 'https://example.com/autor/ana/',
        classification: 'legacy_author_book_combined',
        tfLibro: 'Libro Uno',
        createdAt: null,
        modifiedAt: null,
        biographyPreview: null,
        rawReviewPreview: 'Texto compartido',
        thumbnailId: '10',
        thumbnailUrl: 'https://example.com/foto-ana.jpg',
        imageFieldId: null,
        imageFieldUrl: null,
        relatedBooks: [{ bookCandidateKey: 'book:uno', title: 'Libro Uno' }],
        yoastMetaTitle: null,
        yoastMetaDescription: null,
      },
      {
        candidateKey: 'author:2',
        sourceWpPostId: '2',
        name: 'Ana',
        normalizedName: 'ana',
        slug: 'ana-2',
        oldUrl: 'https://example.com/autor/ana-2/',
        classification: 'legacy_author_book_combined',
        tfLibro: 'Libro Dos',
        createdAt: null,
        modifiedAt: null,
        biographyPreview: null,
        rawReviewPreview: 'Texto compartido',
        thumbnailId: '10',
        thumbnailUrl: 'https://example.com/foto-ana.jpg',
        imageFieldId: null,
        imageFieldUrl: null,
        relatedBooks: [{ bookCandidateKey: 'book:dos', title: 'Libro Dos' }],
        yoastMetaTitle: null,
        yoastMetaDescription: null,
      },
    ],
    ...overrides,
  };
}

function createDuplicateReview(groups: AuthorDuplicateReviewGroup[]): AuthorDuplicateReviewFile {
  return {
    summary: {
      duplicateGroups: groups.length,
      affectedRecords: groups.reduce((total, group) => total + group.members.length, 0),
      mergeHighConfidence: groups.filter((group) => group.proposal === 'MERGE_HIGH_CONFIDENCE')
        .length,
      likelyMergeManualConfirmation: groups.filter(
        (group) => group.proposal === 'LIKELY_MERGE_MANUAL_CONFIRMATION',
      ).length,
      keepSeparate: 0,
      manualReview: 0,
      expectedUniqueAuthorsAfterHighConfidence: 1,
      legacyPattern: {
        groupsWithMultipleLegacyBookRows: 1,
        distinctBooksAcrossDuplicateGroups: 2,
      },
      conflictingAuthorPhotos: groups.filter(
        (group) => group.photoClassification === 'MULTIPLE_CONFLICTING_IMAGES',
      ).length,
    },
    groups,
  };
}

function createSimulation(): MassResolutionSimulationFile {
  return {
    bookR: {
      status: 'MANUAL_REVIEW',
      sourceWpPostId: '1376',
      titleRaw: 'R',
      tfLibroRaw: 'R',
      normalizedTitle: 'r',
      author: 'María Isabel',
      rawReviewPreview: 'Texto de book r',
      slug: 'r',
      attachments: [
        {
          attachmentId: '1379',
          url: 'https://example.com/book-r.jpg',
          reason: 'thumbnailId en books-candidates.csv',
        },
      ],
      oldUrl: 'https://example.com/autor/maria-isabel/',
      hiddenCharacterEvidence: [],
      reasons: ['slug demasiado corto'],
    },
  };
}

describe('final author duplicate review', () => {
  it('orders high-confidence groups before likely merge groups', () => {
    const likely = createGroup({
      groupId: 'possible-author:likely',
      proposal: 'LIKELY_MERGE_MANUAL_CONFIRMATION',
      confidence: 0.74,
    });
    const high = createGroup({ groupId: 'possible-author:high' });

    expect(orderGroupsForHumanReview([likely, high]).map((group) => group.groupId)).toEqual([
      'possible-author:high',
      'possible-author:likely',
    ]);
  });

  it('keeps approvedAction null for every group', () => {
    const decisions = createMassDecisionsReview('2026-07-23T00:00:00.000Z', [
      createGroup(),
      createGroup({ groupId: 'possible-author:likely' }),
    ]);

    expect(
      Object.values(decisions.authorDuplicateGroups).every(
        (decision) => decision.approvedAction === null,
      ),
    ).toBe(true);
  });

  it('does not invent field decisions when photo conflict is present', () => {
    const decisions = createMassDecisionsReview('2026-07-23T00:00:00.000Z', [
      createGroup({
        photoClassification: 'MULTIPLE_CONFLICTING_IMAGES',
        canonicalPhoto: null,
        fieldConflicts: ['MANUAL_REVIEW_FIELD_CONFLICT:photo'],
      }),
    ]);
    const decision = decisions.authorDuplicateGroups['possible-author:ana'];

    expect(decision?.fieldResolution.photoFrom).toBeNull();
    expect(decision?.fieldResolution.requiresFieldDecision).toBe(true);
  });

  it('renders all groups, images, associated books, canonical author and visible conflicts', () => {
    const result = createFinalReview({
      generatedAt: '2026-07-23T00:00:00.000Z',
      duplicateReview: createDuplicateReview([
        createGroup({
          photoClassification: 'MULTIPLE_CONFLICTING_IMAGES',
          fieldConflicts: ['MANUAL_REVIEW_FIELD_CONFLICT:photo'],
        }),
      ]),
      simulation: createSimulation(),
      massDirectory: '/tmp/mass',
    });

    expect(result.orderedGroups).toHaveLength(1);
    expect(result.html).toContain('https://example.com/foto-ana.jpg');
    expect(result.html).toContain('Libro Uno');
    expect(result.html).toContain('PROPOSED CANONICAL AUTHOR');
    expect(result.html).toContain('PHOTO_CONFLICT');
  });

  it('includes book:r as manual review in the generated HTML', () => {
    const result = createFinalReview({
      duplicateReview: createDuplicateReview([createGroup()]),
      simulation: createSimulation(),
      massDirectory: '/tmp/mass',
    });

    expect(result.html).toContain('book:r · MANUAL_REVIEW');
    expect(result.html).toContain('No corregir automáticamente');
  });

  it('writes only review files and not mass-decisions.json', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mass-review-'));
    const result = createFinalReview({
      duplicateReview: createDuplicateReview([createGroup()]),
      simulation: createSimulation(),
      massDirectory: directory,
    });

    await writeFinalReviewOutputs(result, directory);

    await expect(
      readFile(path.join(directory, 'author-duplicate-final-review.html'), 'utf8'),
    ).resolves.toContain('Revisión final de duplicados de autores');
    await expect(
      readFile(path.join(directory, 'mass-decisions-review.json'), 'utf8'),
    ).resolves.toContain('"approvedAction": null');
    await expect(
      readFile(path.join(directory, 'mass-decisions.json'), 'utf8'),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('fails if a final mass-decisions.json already exists', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mass-review-existing-'));
    await mkdir(directory, { recursive: true });
    await writeFinalReviewOutputs(
      createFinalReview({
        duplicateReview: createDuplicateReview([createGroup()]),
        simulation: createSimulation(),
        massDirectory: directory,
      }),
      directory,
    );
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(path.join(directory, 'mass-decisions.json'), '{}\n', 'utf8'),
    );

    await expect(ensureNoFinalMassDecisions(directory)).rejects.toThrow(
      'mass-decisions.json already exists',
    );
  });

  it('categorizes simple high-confidence groups as safe to approve merge', () => {
    const result = createFinalReview({
      duplicateReview: createDuplicateReview([createGroup()]),
      simulation: createSimulation(),
      massDirectory: '/tmp/mass',
    });

    expect(result.decisionSummary.groups.SAFE_TO_APPROVE_MERGE).toEqual(['possible-author:ana']);
  });
});
