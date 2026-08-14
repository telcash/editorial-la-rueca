import type {
  AuthorDedupeApplyExecutionStats,
  AuthorDedupeApplyManifest,
  AuthorDedupeApplyManifestEntry,
  AuthorDedupeApplyPlan,
  AuthorDedupeApplyResult,
  AuthorDedupeRollbackPlan,
} from './apply-types';
import type { AuthorDedupeApplyRepository } from './apply-repository';

export interface AuthorDedupeCheckpointWriter {
  persist(plan: AuthorDedupeApplyPlan): Promise<void>;
}

export interface ApplyAuthorDedupeOptions {
  repository: Pick<AuthorDedupeApplyRepository, 'executeGroupMerge'>;
  checkpointWriter: AuthorDedupeCheckpointWriter;
  batchSize: number;
}

export async function applyAuthorDedupe(
  plan: AuthorDedupeApplyPlan,
  options: ApplyAuthorDedupeOptions,
): Promise<AuthorDedupeApplyResult> {
  assertNoBlockers(plan);
  syncResultFromManifest(plan);

  let processedInBatch = 0;

  for (const group of plan.groups) {
    const entry = getManifestEntry(plan.manifest, group.groupId);

    if (!entry || entry.status === 'applied') {
      continue;
    }

    try {
      markEntry(entry, {
        status: 'in_progress',
        checkpoint: 'started',
        startedAt: entry.startedAt ?? new Date().toISOString(),
        error: null,
      });
      await options.checkpointWriter.persist(plan);

      const stats = await options.repository.executeGroupMerge(group);

      markEntryFromStats(entry, stats, 'relations_reconciled');
      await options.checkpointWriter.persist(plan);
      markEntryFromStats(entry, stats, 'canonical_updated');
      await options.checkpointWriter.persist(plan);
      markEntryFromStats(entry, stats, 'duplicates_archived');
      await options.checkpointWriter.persist(plan);
      markEntryFromStats(entry, stats, 'complete');
      markEntry(entry, {
        status: 'applied',
        completedAt: new Date().toISOString(),
      });
      syncResultFromManifest(plan);
      await options.checkpointWriter.persist(plan);
      processedInBatch += 1;

      if (processedInBatch >= options.batchSize) {
        plan.manifest.completedBatches.push(plan.manifest.currentBatchIndex);
        plan.manifest.currentBatchIndex += 1;
        processedInBatch = 0;
        await options.checkpointWriter.persist(plan);
      }
    } catch (error) {
      markEntry(entry, {
        status: 'failed',
        checkpoint: 'failed',
        error: error instanceof Error ? error.message : 'Unknown author dedupe apply error.',
      });
      syncResultFromManifest(plan);
      await options.checkpointWriter.persist(plan);
      throw error;
    }
  }

  if (processedInBatch > 0) {
    plan.manifest.completedBatches.push(plan.manifest.currentBatchIndex);
    plan.manifest.currentBatchIndex += 1;
  }

  syncResultFromManifest(plan);
  await options.checkpointWriter.persist(plan);

  return plan.result;
}

export function restoreAuthorDedupeApplyState(
  plan: AuthorDedupeApplyPlan,
  existingManifest: AuthorDedupeApplyManifest | null,
  existingRollbackPlan: AuthorDedupeRollbackPlan | null,
) {
  if (existingManifest) {
    const existingEntriesByGroupId = new Map(
      existingManifest.entries.map((entry) => [entry.groupId, entry]),
    );

    plan.manifest.entries = plan.manifest.entries.map((entry) => {
      const existingEntry = existingEntriesByGroupId.get(entry.groupId);

      if (!existingEntry || existingEntry.status === 'planned') {
        return entry;
      }

      return {
        ...entry,
        status: existingEntry.status,
        checkpoint: existingEntry.checkpoint,
        relationsMoved: existingEntry.relationsMoved,
        relationsSkippedAsDuplicate: existingEntry.relationsSkippedAsDuplicate,
        canonicalUpdated: existingEntry.canonicalUpdated,
        duplicatesArchived: existingEntry.duplicatesArchived,
        startedAt: existingEntry.startedAt,
        completedAt: existingEntry.completedAt,
        updatedAt: existingEntry.updatedAt,
        error: existingEntry.error,
      };
    });
    plan.manifest.currentBatchIndex = existingManifest.currentBatchIndex;
    plan.manifest.completedBatches = existingManifest.completedBatches;
  }

  if (existingRollbackPlan) {
    plan.rollbackPlan = existingRollbackPlan;
  }

  syncResultFromManifest(plan);
}

export function syncResultFromManifest(plan: AuthorDedupeApplyPlan) {
  const appliedEntries = plan.manifest.entries.filter((entry) => entry.status === 'applied');
  const failedEntries = plan.manifest.entries.filter((entry) => entry.status === 'failed');
  const partialEntries = plan.manifest.entries.filter((entry) => entry.status === 'partial');
  const skippedEntries = plan.manifest.entries.filter((entry) => entry.status === 'planned');

  plan.result = {
    ...plan.result,
    groupsPlanned: plan.manifest.entries.length,
    groupsApplied: appliedEntries.length,
    groupsSkipped: skippedEntries.length,
    groupsFailed: failedEntries.length,
    canonicalAuthorsUpdated: appliedEntries.filter((entry) => entry.canonicalUpdated).length,
    duplicateAuthorsArchived: appliedEntries.reduce(
      (total, entry) => total + entry.duplicatesArchived,
      0,
    ),
    relationsMoved: appliedEntries.reduce((total, entry) => total + entry.relationsMoved, 0),
    duplicateRelationsAvoided: appliedEntries.reduce(
      (total, entry) => total + entry.relationsSkippedAsDuplicate,
      0,
    ),
    partial: partialEntries.length,
    failed: failedEntries.length,
  };
}

function assertNoBlockers(plan: AuthorDedupeApplyPlan) {
  const blockers = plan.conflicts.filter((conflict) => conflict.severity === 'error');

  if (blockers.length > 0) {
    throw new Error(`Author dedupe apply bloqueado por ${blockers.length} conflicto(s).`);
  }
}

function getManifestEntry(manifest: AuthorDedupeApplyManifest, groupId: string) {
  return manifest.entries.find((entry) => entry.groupId === groupId);
}

function markEntryFromStats(
  entry: AuthorDedupeApplyManifestEntry,
  stats: AuthorDedupeApplyExecutionStats,
  checkpoint: AuthorDedupeApplyManifestEntry['checkpoint'],
) {
  markEntry(entry, {
    checkpoint,
    relationsMoved: stats.relationsMoved,
    relationsSkippedAsDuplicate: stats.relationsSkippedAsDuplicate,
    canonicalUpdated: stats.canonicalUpdated,
    duplicatesArchived: stats.duplicatesArchived,
  });
}

function markEntry(
  entry: AuthorDedupeApplyManifestEntry,
  updates: Partial<AuthorDedupeApplyManifestEntry>,
) {
  Object.assign(entry, updates, {
    updatedAt: new Date().toISOString(),
  });
}
