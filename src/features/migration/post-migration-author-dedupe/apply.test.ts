import { describe, expect, it, vi } from 'vitest';

import { applyAuthorDedupe, restoreAuthorDedupeApplyState } from './apply';
import { createAuthorDedupeApplyPlan, createAuthorDedupePlanFingerprint } from './apply-plan';
import { runAuthorDedupePreflight, validateAuthorDedupeResumeState } from './preflight';
import type {
  AuthorDedupeApplyExecutionStats,
  AuthorDedupeAuthorSnapshot,
  AuthorDedupeRelationSnapshot,
} from './apply-types';
import type { AuthorDedupeDecisionRecord, AuthorDedupeFinalReview } from './types';

describe('author dedupe apply planning', () => {
  it('plans 29 valid merge decisions without writing', () => {
    const review = createReview(
      Array.from({ length: 29 }, (_, index) =>
        createDecision({
          groupId: `group-${index + 1}`,
          canonicalAuthorId: `author-c-${index + 1}`,
          mergeAuthorIds: [`author-d-${index + 1}`],
        }),
      ),
    );
    const plan = createPlan(review);

    expect(plan.summary.approvedGroups).toBe(29);
    expect(plan.summary.canonicalAuthors).toBe(29);
    expect(plan.summary.duplicateAuthorsToArchive).toBe(29);
    expect(plan.summary.blockers).toBe(0);
    expect(plan.result.groupsPlanned).toBe(29);
  });

  it('detects missing canonical and duplicate authors', () => {
    const review = createReview([
      createDecision({
        canonicalAuthorId: 'missing-canonical',
        mergeAuthorIds: ['missing-duplicate'],
      }),
    ]);
    const plan = createAuthorDedupeApplyPlan({
      decisionsFile: 'author-dedupe-decisions.json',
      review,
      authors: [],
      relations: [],
      mode: 'dry-run',
      batchSize: 5,
      generatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(plan.conflicts.map((conflict) => conflict.code)).toEqual([
      'CANONICAL_MISSING',
      'DUPLICATE_MISSING',
    ]);
    expect(plan.summary.blockers).toBe(2);
  });

  it('detects overlapping groups and canonical authors reused as duplicates', () => {
    const review = createReview([
      createDecision({
        groupId: 'group-a',
        canonicalAuthorId: 'author-a',
        mergeAuthorIds: ['author-b'],
      }),
      createDecision({
        groupId: 'group-b',
        canonicalAuthorId: 'author-c',
        mergeAuthorIds: ['author-a', 'author-b'],
      }),
    ]);
    const plan = createPlan(review);

    expect(plan.conflicts.map((conflict) => conflict.code)).toContain('OVERLAPPING_DUPLICATE');
    expect(plan.conflicts.map((conflict) => conflict.code)).toContain(
      'CANONICAL_USED_AS_DUPLICATE',
    );
  });

  it('moves missing relations and avoids duplicate canonical relations', () => {
    const review = createReview([
      createDecision({
        canonicalAuthorId: 'author-c',
        mergeAuthorIds: ['author-d'],
      }),
    ]);
    const plan = createPlan(review, [
      createRelation({ authorId: 'author-c', bookId: 'book-existing', sortOrder: 0 }),
      createRelation({ authorId: 'author-d', bookId: 'book-existing', sortOrder: 3 }),
      createRelation({ authorId: 'author-d', bookId: 'book-new', sortOrder: 4 }),
    ]);
    const [group] = plan.groups;

    expect(group.relationsToMove).toEqual([
      expect.objectContaining({
        bookId: 'book-new',
        fromAuthorId: 'author-d',
        toAuthorId: 'author-c',
        sortOrder: 4,
      }),
    ]);
    expect(group.relationsSkippedAsDuplicate).toEqual([
      expect.objectContaining({
        bookId: 'book-existing',
        reason: 'canonical_relation_exists',
      }),
    ]);
  });

  it('does not include batch size in the plan fingerprint', () => {
    const review = createReview([createDecision()]);
    const firstPlan = createPlan(review, [], 5);
    const secondPlan = createPlan(review, [], 20);

    expect(firstPlan.planFingerprint).toBe(secondPlan.planFingerprint);
    expect(firstPlan.planFingerprint).toBe(createAuthorDedupePlanFingerprint(review));
  });
});

describe('author dedupe preflight and resume', () => {
  it('blocks slug collisions with authors outside the merge group', async () => {
    const review = createReview([createDecision()]);
    const plan = createPlan(review);
    const conflicts = await runAuthorDedupePreflight(plan, {
      async readAuthorsBySlugs() {
        return [createAuthor({ id: 'outside-author', slug: 'canonical-slug' })];
      },
    });

    expect(conflicts).toContainEqual(
      expect.objectContaining({
        code: 'SLUG_COLLISION',
        severity: 'error',
      }),
    );
  });

  it('requires resume when a real apply manifest was started', () => {
    const plan = createPlan(createReview([createDecision()]));
    plan.manifest.entries[0].status = 'applied';

    const conflicts = validateAuthorDedupeResumeState({
      apply: true,
      resume: false,
      planFingerprint: plan.planFingerprint,
      existingManifest: plan.manifest,
    });

    expect(conflicts).toEqual([
      expect.objectContaining({
        code: 'APPLY_ALREADY_STARTED',
        severity: 'error',
      }),
    ]);
  });

  it('blocks resume with a mismatched fingerprint', () => {
    const plan = createPlan(createReview([createDecision()]));

    const conflicts = validateAuthorDedupeResumeState({
      apply: true,
      resume: true,
      planFingerprint: 'different',
      existingManifest: plan.manifest,
    });

    expect(conflicts).toEqual([
      expect.objectContaining({
        code: 'FINGERPRINT_MISMATCH',
        severity: 'error',
      }),
    ]);
  });
});

describe('author dedupe apply orchestration', () => {
  it('updates manifest checkpoints, result counters, and batch checkpoints from real execution', async () => {
    const plan = createPlan(
      createReview([
        createDecision(),
        createDecision({
          groupId: 'group-2',
          canonicalAuthorId: 'author-c-2',
          mergeAuthorIds: ['author-d-2'],
        }),
      ]),
    );
    const persist = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const executeGroupMerge = vi
      .fn<() => Promise<AuthorDedupeApplyExecutionStats>>()
      .mockResolvedValue({
        relationsMoved: 1,
        relationsSkippedAsDuplicate: 2,
        canonicalUpdated: true,
        duplicatesArchived: 1,
      });

    await applyAuthorDedupe(plan, {
      repository: { executeGroupMerge },
      checkpointWriter: { persist },
      batchSize: 1,
    });

    expect(executeGroupMerge).toHaveBeenCalledTimes(2);
    expect(plan.manifest.entries.every((entry) => entry.status === 'applied')).toBe(true);
    expect(plan.manifest.completedBatches).toEqual([0, 1]);
    expect(plan.result).toEqual(
      expect.objectContaining({
        groupsApplied: 2,
        canonicalAuthorsUpdated: 2,
        duplicateAuthorsArchived: 2,
        relationsMoved: 2,
        duplicateRelationsAvoided: 4,
      }),
    );
  });

  it('skips already applied groups on resume', async () => {
    const plan = createPlan(
      createReview([
        createDecision(),
        createDecision({
          groupId: 'group-2',
          canonicalAuthorId: 'author-c-2',
          mergeAuthorIds: ['author-d-2'],
        }),
      ]),
    );
    const existingManifest = structuredClone(plan.manifest);
    existingManifest.entries[0].status = 'applied';
    existingManifest.entries[0].checkpoint = 'complete';
    existingManifest.entries[0].relationsMoved = 1;
    existingManifest.entries[0].canonicalUpdated = true;
    existingManifest.entries[0].duplicatesArchived = 1;
    restoreAuthorDedupeApplyState(plan, existingManifest, null);
    const executeGroupMerge = vi
      .fn<() => Promise<AuthorDedupeApplyExecutionStats>>()
      .mockResolvedValue({
        relationsMoved: 0,
        relationsSkippedAsDuplicate: 0,
        canonicalUpdated: true,
        duplicatesArchived: 1,
      });

    await applyAuthorDedupe(plan, {
      repository: { executeGroupMerge },
      checkpointWriter: { persist: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) },
      batchSize: 5,
    });

    expect(executeGroupMerge).toHaveBeenCalledTimes(1);
    expect(plan.result.groupsApplied).toBe(2);
  });

  it('marks a group as failed when the transactional repository rejects', async () => {
    const plan = createPlan(createReview([createDecision()]));

    await expect(
      applyAuthorDedupe(plan, {
        repository: {
          async executeGroupMerge() {
            throw new Error('transaction rolled back');
          },
        },
        checkpointWriter: { persist: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) },
        batchSize: 5,
      }),
    ).rejects.toThrow('transaction rolled back');

    expect(plan.manifest.entries[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        checkpoint: 'failed',
        error: 'transaction rolled back',
      }),
    );
    expect(plan.result.failed).toBe(1);
  });
});

function createPlan(
  review: AuthorDedupeFinalReview,
  relations: AuthorDedupeRelationSnapshot[] = [],
  batchSize = 5,
) {
  return createAuthorDedupeApplyPlan({
    decisionsFile: 'author-dedupe-decisions.json',
    review,
    authors: getAuthorsFromReview(review),
    relations,
    mode: 'dry-run',
    batchSize,
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
}

function createReview(decisions: AuthorDedupeDecisionRecord[]): AuthorDedupeFinalReview {
  return {
    schemaVersion: 1,
    generatedAt: '2026-01-01T00:00:00.000Z',
    decisions,
    statistics: {
      totalGroups: decisions.length,
      proposalOnly: 0,
      merge: decisions.filter((decision) => decision.decision === 'merge').length,
      keepSeparate: 0,
      manualReview: 0,
      reviewed: decisions.length,
      pendingReview: 0,
      highConfidence: 0,
      likelyDuplicate: decisions.length,
      originalManualReview: 0,
      photoConflicts: 0,
      biographyConflicts: 0,
    },
  };
}

function createDecision(
  overrides: Partial<AuthorDedupeDecisionRecord> = {},
): AuthorDedupeDecisionRecord {
  const groupId = overrides.groupId ?? 'group-1';
  const canonicalAuthorId = overrides.canonicalAuthorId ?? 'author-c';
  const mergeAuthorIds = overrides.mergeAuthorIds ?? ['author-d'];

  return {
    groupId,
    classification: 'LIKELY_DUPLICATE',
    decision: 'merge',
    canonicalAuthorId,
    mergeAuthorIds,
    selectedFields: {
      name: 'Canonical Author',
      slug: 'canonical-slug',
      photoUrl: null,
      biography: null,
      country: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      isPublished: true,
      isFeatured: false,
      sortOrder: 0,
    },
    fieldConflicts: [],
    notes: '',
    reviewed: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function getAuthorsFromReview(review: AuthorDedupeFinalReview) {
  return review.decisions.flatMap((decision) => [
    createAuthor({ id: decision.canonicalAuthorId }),
    ...decision.mergeAuthorIds.map((id) => createAuthor({ id })),
  ]);
}

function createAuthor(
  overrides: Partial<AuthorDedupeAuthorSnapshot> = {},
): AuthorDedupeAuthorSnapshot {
  const id = overrides.id ?? 'author-c';

  return {
    id,
    name: 'Author',
    slug: id,
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
    archivedAt: null,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createRelation(
  overrides: Partial<AuthorDedupeRelationSnapshot> = {},
): AuthorDedupeRelationSnapshot {
  return {
    bookId: 'book-1',
    authorId: 'author-c',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    bookTitle: 'Book',
    bookSlug: 'book',
    bookExists: true,
    ...overrides,
  };
}
