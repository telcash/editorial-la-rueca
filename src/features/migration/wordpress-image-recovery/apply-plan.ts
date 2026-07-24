import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  EditorialReviewDecisionRecord,
  EditorialReviewImage,
  EditorialReviewSelectionSource,
} from './editorial-review';
import { analyzeImageRecovery } from './analyzer';
import type {
  ImageRecoveryApplyConflict,
  ImageRecoveryApplyManifest,
  ImageRecoveryApplyManifestEntry,
  ImageRecoveryApplyMode,
  ImageRecoveryApplyOperation,
  ImageRecoveryApplyPlan,
  ImageRecoveryApplyResult,
  ImageRecoveryRollbackPlan,
} from './apply-types';
import type { RecoveryPlanItem } from './types';

interface MassManifestEntry {
  candidateKey: string;
  entityType: string;
  sourceWpPostId: string;
  targetId: string | null;
  status: string;
  checkpoint: string;
  sourceMetadata?: Record<string, string | boolean | null>;
}

interface MassManifest {
  entries: MassManifestEntry[];
}

interface EditorialReviewDecisionExport {
  decisions: EditorialReviewDecisionRecord[];
}

export interface BuildImageRecoveryApplyPlanParams {
  massDirectory: string;
  auditDirectory: string;
  mode: ImageRecoveryApplyMode;
  batchSize: number;
  resume: boolean;
  xmlInputPath?: string;
}

export async function buildImageRecoveryApplyPlan(
  params: BuildImageRecoveryApplyPlanParams,
): Promise<ImageRecoveryApplyPlan> {
  const generatedAt = new Date().toISOString();
  const massDirectory = path.resolve(params.massDirectory);
  const imageRecoveryDirectory = path.join(massDirectory, 'image-recovery');
  const applyDirectory = path.join(imageRecoveryDirectory, 'apply');
  const decisionsPath = path.join(imageRecoveryDirectory, 'editorial-review-decisions.json');
  const conflicts: ImageRecoveryApplyConflict[] = [];

  await assertFileExists(decisionsPath, conflicts);

  const [massManifest, editorialDecisions, recoveryPlan, existingManifest, existingRollbackPlan] =
    await Promise.all([
      readJson<MassManifest>(path.join(massDirectory, 'apply', 'manifest.json')),
      readEditorialDecisions(decisionsPath, conflicts),
      analyzeImageRecovery({
        paths: {
          massApplyDirectory: path.join(massDirectory, 'apply'),
          auditDirectory: path.resolve(params.auditDirectory),
          outputDirectory: imageRecoveryDirectory,
          xmlInputPath: params.xmlInputPath,
        },
        mode: params.mode === 'dry-run' ? 'dry-run' : 'analyze',
        batchSize: params.batchSize,
      }),
      params.resume
        ? readOptionalJson<ImageRecoveryApplyManifest>(path.join(applyDirectory, 'manifest.json'))
        : Promise.resolve(null),
      params.resume
        ? readOptionalJson<ImageRecoveryRollbackPlan>(
            path.join(applyDirectory, 'rollback-plan.json'),
          )
        : Promise.resolve(null),
    ]);
  const operations = [
    ...createBookCoverOperations(editorialDecisions, massManifest, conflicts),
    ...createAuthorPhotoOperations(recoveryPlan.items, massManifest, conflicts),
  ];
  const manifest = mergeManifest({
    generatedAt,
    mode: params.mode,
    batchSize: params.batchSize,
    operations,
    existingManifest,
  });
  const rollbackPlan =
    existingRollbackPlan ??
    ({
      generatedAt,
      resources: [],
      orderedOperations: [],
      warnings: [],
    } satisfies ImageRecoveryRollbackPlan);
  const result = createApplyResult(generatedAt, params.mode, operations, conflicts, manifest);

  return {
    generatedAt,
    mode: params.mode,
    batchSize: params.batchSize,
    operations,
    conflicts,
    manifest,
    rollbackPlan,
    result,
  };
}

function createBookCoverOperations(
  decisions: EditorialReviewDecisionRecord[],
  massManifest: MassManifest,
  conflicts: ImageRecoveryApplyConflict[],
): ImageRecoveryApplyOperation[] {
  const duplicateDecisionKeys = findDuplicateDecisionKeys(decisions);
  const operations: ImageRecoveryApplyOperation[] = [];

  for (const decision of decisions) {
    const bookEntry = findMassEntityEntry(massManifest, 'book', decision.candidateKey);
    const sourceWpPostId = bookEntry?.sourceWpPostId ?? null;
    const targetId = bookEntry?.targetId ?? null;
    const selectedImage = decision.selectedImage;
    const blockerCodes: string[] = [];
    const reasons: string[] = [];

    if (duplicateDecisionKeys.has(decision.candidateKey)) {
      blockerCodes.push('DUPLICATE_EDITORIAL_DECISION');
    }

    if (!bookEntry) {
      blockerCodes.push('MISSING_BOOK_MANIFEST_ENTRY');
    }

    if (!targetId) {
      blockerCodes.push('MISSING_BOOK_TARGET_ID');
    }

    if (decision.decision === 'approved' && !hasUsableImage(selectedImage)) {
      blockerCodes.push('MISSING_SELECTED_IMAGE');
    }

    for (const blockerCode of blockerCodes) {
      conflicts.push({
        severity: 'error',
        code: blockerCode,
        entityType: 'book_cover',
        candidateKey: decision.candidateKey,
        message: `No se puede planificar portada para ${decision.candidateKey}.`,
        details: null,
      });
    }

    if (decision.decision === 'rejected') {
      reasons.push('Decision editorial: rechazar/sin portada.');
    } else if (decision.decision === 'manual') {
      reasons.push('Decision editorial: revision manual posterior.');
    } else {
      reasons.push(
        decision.selectionSource === 'editorial-manual'
          ? 'Decision editorial aprobada con candidata corregida manualmente.'
          : 'Decision editorial aprobada con propuesta del algoritmo.',
      );
    }

    operations.push({
      operationKey: `book_cover:${decision.candidateKey}`,
      entityType: 'book_cover',
      candidateKey: decision.candidateKey,
      sourceWpPostId,
      targetId,
      title: decision.candidateKey,
      status:
        decision.decision === 'approved'
          ? blockerCodes.length > 0
            ? 'blocked'
            : 'ready'
          : decision.decision === 'manual'
            ? 'manual_action_required'
            : 'skipped',
      sourceUrl: decision.decision === 'approved' ? (selectedImage?.url ?? null) : null,
      filename: decision.decision === 'approved' ? (selectedImage?.filename ?? null) : null,
      source: 'editorial-review',
      selectionSource: normalizeSelectionSource(decision.selectionSource),
      category: decision.decision === 'approved' ? 'approved_book_cover' : decision.decision,
      decision: decision.decision,
      transform: createTransform('book_cover'),
      reasons,
      blockerCodes,
      editorialDecision: decision,
    });
  }

  return operations;
}

function createAuthorPhotoOperations(
  recoveryItems: RecoveryPlanItem[],
  massManifest: MassManifest,
  conflicts: ImageRecoveryApplyConflict[],
): ImageRecoveryApplyOperation[] {
  return recoveryItems
    .filter((item) => item.entityType === 'author')
    .filter((item) => item.category === 'safe_author_photo' || item.category === 'technical_retry')
    .map((item) => {
      const authorEntry = findMassEntityEntry(massManifest, 'author', item.candidateKey);
      const targetId = authorEntry?.targetId ?? null;
      const blockerCodes: string[] = [];

      if (!authorEntry) {
        blockerCodes.push('MISSING_AUTHOR_MANIFEST_ENTRY');
      }

      if (!targetId) {
        blockerCodes.push('MISSING_AUTHOR_TARGET_ID');
      }

      if (!item.candidate?.url) {
        blockerCodes.push('MISSING_AUTHOR_IMAGE_URL');
      }

      for (const blockerCode of blockerCodes) {
        conflicts.push({
          severity: 'error',
          code: blockerCode,
          entityType: 'author_photo',
          candidateKey: item.candidateKey,
          message: `No se puede planificar foto de autor para ${item.candidateKey}.`,
          details: null,
        });
      }

      return {
        operationKey: `author_photo:${item.candidateKey}`,
        entityType: 'author_photo',
        candidateKey: item.candidateKey,
        sourceWpPostId: authorEntry?.sourceWpPostId ?? item.sourceWpPostId,
        targetId,
        title: item.title,
        status: blockerCodes.length > 0 ? 'blocked' : 'ready',
        sourceUrl: item.candidate?.url ?? null,
        filename: item.candidate?.filename ?? null,
        source: 'image-recovery-plan',
        selectionSource: 'none',
        category: item.category,
        decision: item.decision,
        transform: createTransform('author_photo'),
        reasons: item.reasons,
        blockerCodes,
        recoveryItem: item,
      } satisfies ImageRecoveryApplyOperation;
    });
}

function mergeManifest(params: {
  generatedAt: string;
  mode: ImageRecoveryApplyMode;
  batchSize: number;
  operations: ImageRecoveryApplyOperation[];
  existingManifest: ImageRecoveryApplyManifest | null;
}): ImageRecoveryApplyManifest {
  const existingEntriesByKey = new Map(
    params.existingManifest?.entries.map((entry) => [entry.operationKey, entry]) ?? [],
  );

  return {
    generatedAt: params.existingManifest?.generatedAt ?? params.generatedAt,
    mode: params.mode,
    batchSize: params.batchSize,
    currentBatchIndex: params.existingManifest?.currentBatchIndex ?? 0,
    completedBatches: params.existingManifest?.completedBatches ?? [],
    entries: params.operations.map((operation) => {
      const existingEntry = existingEntriesByKey.get(operation.operationKey);

      if (existingEntry) {
        return existingEntry;
      }

      return createManifestEntry(operation, params.generatedAt);
    }),
  };
}

function createManifestEntry(
  operation: ImageRecoveryApplyOperation,
  timestamp: string,
): ImageRecoveryApplyManifestEntry {
  return {
    operationKey: operation.operationKey,
    entityType: operation.entityType,
    candidateKey: operation.candidateKey,
    targetId: operation.targetId,
    status: operation.status,
    checkpoint:
      operation.status === 'ready' || operation.status === 'blocked'
        ? 'planned'
        : operation.status === 'manual_action_required'
          ? 'manual_action_required'
          : operation.status === 'skipped'
            ? 'skipped'
            : 'planned',
    sourceUrl: operation.sourceUrl,
    storagePath: null,
    publicUrl: null,
    previousUrl: null,
    updatedAt: timestamp,
    sourceMetadata: {
      source: operation.source,
      category: operation.category,
      decision: operation.decision,
      selectionSource: operation.selectionSource,
    },
  };
}

function createApplyResult(
  generatedAt: string,
  mode: ImageRecoveryApplyMode,
  operations: ImageRecoveryApplyOperation[],
  conflicts: ImageRecoveryApplyConflict[],
  manifest: ImageRecoveryApplyManifest,
): ImageRecoveryApplyResult {
  const approvedBookOperations = operations.filter(
    (operation) => operation.entityType === 'book_cover' && operation.decision === 'approved',
  );
  const readyOperations = operations.filter((operation) => operation.status === 'ready');
  const manifestEntries = manifest.entries;

  return {
    generatedAt,
    mode,
    bookCoversUploaded: manifestEntries.filter(
      (entry) => entry.entityType === 'book_cover' && entry.status === 'applied',
    ).length,
    authorPhotosUploaded: manifestEntries.filter(
      (entry) => entry.entityType === 'author_photo' && entry.status === 'applied',
    ).length,
    alreadyApplied: manifestEntries.filter((entry) => entry.status === 'applied').length,
    skippedRejected: operations.filter(
      (operation) => operation.entityType === 'book_cover' && operation.decision === 'rejected',
    ).length,
    manualActionRequired: operations.filter(
      (operation) => operation.status === 'manual_action_required',
    ).length,
    technicalRetriesRecovered: manifestEntries.filter(
      (entry) =>
        entry.entityType === 'author_photo' &&
        entry.status === 'applied' &&
        entry.sourceMetadata.category === 'technical_retry',
    ).length,
    partial: manifestEntries.filter((entry) => entry.status === 'partial').length,
    failed: manifestEntries.filter((entry) => entry.status === 'failed').length,
    blockers: conflicts.filter((conflict) => conflict.severity === 'error').length,
    totalOperationsToApply: readyOperations.length,
    bookCovers: {
      approvedTotal: approvedBookOperations.length,
      algorithmSelections: approvedBookOperations.filter(
        (operation) => operation.selectionSource === 'algorithm',
      ).length,
      editorialManualSelections: approvedBookOperations.filter(
        (operation) => operation.selectionSource === 'editorial-manual',
      ).length,
      rejected: operations.filter(
        (operation) => operation.entityType === 'book_cover' && operation.decision === 'rejected',
      ).length,
      manualReview: operations.filter(
        (operation) => operation.entityType === 'book_cover' && operation.decision === 'manual',
      ).length,
      readyToApply: operations.filter(
        (operation) => operation.entityType === 'book_cover' && operation.status === 'ready',
      ).length,
      blocked: operations.filter(
        (operation) => operation.entityType === 'book_cover' && operation.status === 'blocked',
      ).length,
    },
    authorPhotos: {
      safeReady: operations.filter(
        (operation) =>
          operation.entityType === 'author_photo' && operation.category === 'safe_author_photo',
      ).length,
      technicalRetries: operations.filter(
        (operation) =>
          operation.entityType === 'author_photo' && operation.category === 'technical_retry',
      ).length,
      alreadyMigrated: manifestEntries.filter(
        (entry) => entry.entityType === 'author_photo' && entry.status === 'applied',
      ).length,
      manualOrAmbiguous: operations.filter(
        (operation) =>
          operation.entityType === 'author_photo' &&
          (operation.status === 'manual_action_required' || operation.category === 'ambiguous'),
      ).length,
      blocked: operations.filter(
        (operation) => operation.entityType === 'author_photo' && operation.status === 'blocked',
      ).length,
    },
  };
}

function findMassEntityEntry(
  manifest: MassManifest,
  entityType: 'author' | 'book',
  candidateKey: string,
) {
  return manifest.entries.find(
    (entry) => entry.entityType === entityType && entry.candidateKey === candidateKey,
  );
}

function findDuplicateDecisionKeys(decisions: EditorialReviewDecisionRecord[]) {
  const seenKeys = new Set<string>();
  const duplicateKeys = new Set<string>();

  for (const decision of decisions) {
    if (seenKeys.has(decision.candidateKey)) {
      duplicateKeys.add(decision.candidateKey);
    }

    seenKeys.add(decision.candidateKey);
  }

  return duplicateKeys;
}

function hasUsableImage(image: EditorialReviewImage | null) {
  return Boolean(image?.url);
}

function createTransform(entityType: 'author_photo' | 'book_cover') {
  return {
    required: false,
    maxWidth: entityType === 'author_photo' ? 1600 : 1800,
    maxHeight: entityType === 'author_photo' ? 1600 : 2800,
    quality: entityType === 'author_photo' ? 82 : 85,
    format: 'jpeg' as const,
    correctExifOrientation: true,
  };
}

function normalizeSelectionSource(
  value: EditorialReviewSelectionSource,
): 'algorithm' | 'editorial-manual' | 'none' {
  return value === 'algorithm' || value === 'editorial-manual' ? value : 'none';
}

async function assertFileExists(filePath: string, conflicts: ImageRecoveryApplyConflict[]) {
  try {
    await access(filePath);
  } catch {
    const conflict = {
      severity: 'error',
      code: 'EDITORIAL_REVIEW_DECISIONS_MISSING',
      entityType: 'system',
      candidateKey: null,
      message:
        'Falta editorial-review-decisions.json; exporta la revision editorial antes de apply.',
      details: filePath,
    } satisfies ImageRecoveryApplyConflict;

    conflicts.push(conflict);
    throw new Error(`${conflict.code}: ${conflict.message}`);
  }
}

async function readEditorialDecisions(
  filePath: string,
  conflicts: ImageRecoveryApplyConflict[],
): Promise<EditorialReviewDecisionRecord[]> {
  try {
    const data = await readJson<EditorialReviewDecisionExport>(filePath);

    if (!Array.isArray(data.decisions)) {
      conflicts.push({
        severity: 'error',
        code: 'EDITORIAL_REVIEW_DECISIONS_INVALID',
        entityType: 'system',
        candidateKey: null,
        message: 'editorial-review-decisions.json no contiene un array decisions valido.',
        details: filePath,
      });

      return [];
    }

    return data.decisions;
  } catch {
    return [];
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readOptionalJson<T>(filePath: string): Promise<T | null> {
  try {
    return await readJson<T>(filePath);
  } catch {
    return null;
  }
}
