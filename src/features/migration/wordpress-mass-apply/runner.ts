import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassRelationPlan,
} from '@/features/migration/wordpress-mass/types';
import type { PilotManifest } from '@/features/migration/wordpress-pilot/types';
import { applyMassMigration } from './apply';
import { planMassApply } from './planner';
import { runMassApplyPreflight } from './preflight';
import { writeMassApplyOutputs } from './output';
import type { MassApplyManifest, MassApplyPlan, MassApplyRollbackPlan } from './types';

export interface MassMigrationOptions {
  massDirectory: string;
  dryRun: boolean;
  preflight: boolean;
  apply: boolean;
  confirm?: string;
  confirmBackup: boolean;
  resume: boolean;
  batchSize: number;
  limit?: number;
}

export async function runMassMigration(options: MassMigrationOptions) {
  if (options.apply && options.confirm !== 'MASS_MIGRATION') {
    throw new Error(
      'Para aplicar la migracion masiva debes usar --apply --confirm MASS_MIGRATION.',
    );
  }

  if (options.apply && !options.confirmBackup) {
    throw new Error(
      'Para aplicar la migracion masiva debes confirmar backup con --confirm-backup.',
    );
  }

  const massDirectory = path.resolve(options.massDirectory);
  const outputDirectory = path.join(massDirectory, 'apply');
  const [
    authors,
    books,
    relations,
    authorImages,
    bookCovers,
    pilotManifest,
    existingManifest,
    existingRollbackPlan,
  ] = await Promise.all([
    readJson<MassAuthorPlan[]>(path.join(massDirectory, 'mass-authors.json')),
    readJson<MassBookPlan[]>(path.join(massDirectory, 'mass-books.json')),
    readJson<MassRelationPlan[]>(path.join(massDirectory, 'mass-relations.json')),
    readJson<MassAuthorImagePlan[]>(path.join(massDirectory, 'mass-author-images.json')),
    readJson<MassBookCoverPlan[]>(path.join(massDirectory, 'mass-book-covers.json')),
    readOptionalJson<PilotManifest>(path.resolve(process.cwd(), 'migration/pilot/manifest.json')),
    readOptionalJson<MassApplyManifest>(path.join(outputDirectory, 'manifest.json')),
    readOptionalJson<MassApplyRollbackPlan>(path.join(outputDirectory, 'rollback-plan.json')),
  ]);
  const mode = options.preflight ? 'preflight' : options.apply ? 'apply' : 'dry-run';
  const plan = planMassApply({
    mode,
    batchSize: options.batchSize,
    limit: options.limit,
    authors,
    books,
    relations,
    authorImages,
    bookCovers,
    pilotManifest,
  });
  plan.manifest.planFingerprint = createPlanFingerprint(plan);
  validateResumeState(options, plan, existingManifest);
  restoreExistingApplyState(plan, existingManifest, existingRollbackPlan);

  if (options.preflight || options.apply) {
    const preflightConflicts = await runMassApplyPreflight(plan);
    plan.conflicts.push(...preflightConflicts);
  }

  if (options.apply) {
    markBackupConfirmation(plan);
    refreshBlockerCount(plan);
    await applyMassMigration(plan, {
      batchSize: options.batchSize,
      checkpointWriter: {
        async persist(updatedPlan) {
          await writeMassApplyOutputs(updatedPlan, outputDirectory);
        },
      },
    });
  } else {
    refreshBlockerCount(plan);
  }

  const files = await writeMassApplyOutputs(plan, outputDirectory);

  return {
    plan,
    files,
    outputDirectory,
  };
}

function restoreExistingApplyState(
  plan: MassApplyPlan,
  existingManifest: MassApplyManifest | null,
  existingRollbackPlan: MassApplyRollbackPlan | null,
) {
  if (existingManifest) {
    const existingEntriesByKey = new Map(
      existingManifest.entries.map((entry) => [createManifestLookupKey(entry), entry]),
    );

    plan.manifest.entries = plan.manifest.entries.map((entry) => {
      const existingEntry = existingEntriesByKey.get(createManifestLookupKey(entry));

      if (!existingEntry || existingEntry.status === 'planned') {
        return entry;
      }

      return {
        ...entry,
        targetId: existingEntry.targetId,
        status: existingEntry.status,
        checkpoint: existingEntry.checkpoint,
        createdAt: existingEntry.createdAt,
        updatedAt: existingEntry.updatedAt,
        warnings: [...entry.warnings, ...existingEntry.warnings],
        sourceMetadata: {
          ...entry.sourceMetadata,
          ...existingEntry.sourceMetadata,
        },
        preexisting: existingEntry.preexisting,
      };
    });
    plan.manifest.completedBatches = existingManifest.completedBatches ?? [];
    plan.manifest.currentBatchIndex = existingManifest.currentBatchIndex ?? 0;
  }

  if (existingRollbackPlan) {
    plan.rollbackPlan = existingRollbackPlan;
  }
}

function validateResumeState(
  options: MassMigrationOptions,
  plan: MassApplyPlan,
  existingManifest: MassApplyManifest | null,
) {
  if (!options.apply) {
    return;
  }

  const hasAppliedState = Boolean(
    existingManifest?.entries.some((entry) =>
      ['applied', 'partial', 'failed'].includes(entry.status),
    ),
  );

  if (!options.resume && hasAppliedState) {
    throw new Error(
      'Existe un manifest de apply con operaciones ya iniciadas. Usa --resume para continuar de forma explicita.',
    );
  }

  if (options.resume && !existingManifest) {
    throw new Error(
      'No existe manifest previo para reanudar. Ejecuta primero una migracion inicial.',
    );
  }

  if (!options.resume) {
    return;
  }

  if (!existingManifest?.planFingerprint) {
    throw new Error('El manifest previo no contiene fingerprint; no es seguro reanudar.');
  }

  if (existingManifest.planFingerprint !== plan.manifest.planFingerprint) {
    throw new Error('El fingerprint del manifest previo no coincide con el plan actual.');
  }
}

function createManifestLookupKey(entry: MassApplyManifest['entries'][number]) {
  return `${entry.entityType}:${entry.candidateKey}`;
}

function markBackupConfirmation(plan: MassApplyPlan) {
  plan.conflicts = plan.conflicts.map((conflict) => {
    if (conflict.code !== 'BACKUP_REQUIRED_BEFORE_APPLY') {
      return conflict;
    }

    return {
      ...conflict,
      severity: 'warning',
      message: 'Backup confirmado antes de ejecutar apply.',
      details: `${conflict.details} Confirmado mediante --confirm-backup.`,
    };
  });
}

function refreshBlockerCount(plan: MassApplyPlan) {
  plan.summary.blockers = plan.conflicts.filter((conflict) => conflict.severity === 'error').length;
}

function createPlanFingerprint(plan: MassApplyPlan) {
  const stablePayload = {
    batchSize: plan.batchSize,
    authors: plan.authors.map((author) => ({
      candidateKey: author.candidateKey,
      action: author.action,
      slug: author.input.slug,
      pilotTargetId: author.pilotTargetId,
    })),
    books: plan.books.map((book) => ({
      candidateKey: book.candidateKey,
      action: book.action,
      slug: book.input.slug,
      authorCandidateKeys: book.authorCandidateKeys,
      pilotTargetId: book.pilotTargetId,
    })),
    relations: plan.relations.map((relation) => ({
      relationKey: relation.relationKey,
      action: relation.action,
    })),
    authorImages: plan.authorImages.map((image) => ({
      candidateKey: image.candidateKey,
      action: image.action,
      attachmentId: image.attachmentId,
      url: image.url,
    })),
    bookCovers: plan.bookCovers.map((image) => ({
      candidateKey: image.candidateKey,
      action: image.action,
      attachmentId: image.attachmentId,
      url: image.url,
    })),
  };

  return createHash('sha256').update(JSON.stringify(stablePayload)).digest('hex');
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readOptionalJson<TData>(filePath: string): Promise<TData | null> {
  try {
    return await readJson<TData>(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}
