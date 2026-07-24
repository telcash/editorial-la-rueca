import type { EditorialReviewDecisionRecord } from './editorial-review';
import type { RecoveryPlanItem } from './types';

export type ImageRecoveryApplyMode = 'dry-run' | 'preflight' | 'apply';
export type ImageRecoveryApplyOperationType = 'book_cover' | 'author_photo';
export type ImageRecoveryApplyOperationStatus =
  'ready' | 'blocked' | 'skipped' | 'manual_action_required' | 'applied' | 'partial' | 'failed';

export interface ImageRecoveryApplyConflict {
  severity: 'error' | 'warning';
  code: string;
  entityType: ImageRecoveryApplyOperationType | 'system';
  candidateKey: string | null;
  message: string;
  details: string | null;
}

export interface ImageRecoveryApplyOperation {
  operationKey: string;
  entityType: ImageRecoveryApplyOperationType;
  candidateKey: string;
  sourceWpPostId: string | null;
  targetId: string | null;
  title: string;
  status: ImageRecoveryApplyOperationStatus;
  sourceUrl: string | null;
  filename: string | null;
  source: 'editorial-review' | 'image-recovery-plan';
  selectionSource: 'algorithm' | 'editorial-manual' | 'none';
  category: string;
  decision: string;
  transform: {
    required: boolean;
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'jpeg';
    correctExifOrientation: boolean;
  };
  reasons: string[];
  blockerCodes: string[];
  editorialDecision?: EditorialReviewDecisionRecord;
  recoveryItem?: RecoveryPlanItem;
}

export interface ImageRecoveryApplyManifestEntry {
  operationKey: string;
  entityType: ImageRecoveryApplyOperationType;
  candidateKey: string;
  targetId: string | null;
  status: ImageRecoveryApplyOperationStatus;
  checkpoint:
    | 'planned'
    | 'uploaded_pending_db'
    | 'applied'
    | 'skipped'
    | 'manual_action_required'
    | 'failed'
    | 'cleanup_failed';
  sourceUrl: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  previousUrl: string | null;
  updatedAt: string;
  sourceMetadata: Record<string, string | boolean | null>;
}

export interface ImageRecoveryApplyManifest {
  generatedAt: string;
  mode: ImageRecoveryApplyMode;
  batchSize: number;
  currentBatchIndex: number;
  completedBatches: number[];
  entries: ImageRecoveryApplyManifestEntry[];
}

export interface ImageRecoveryRollbackResource {
  entityType: ImageRecoveryApplyOperationType;
  targetId: string;
  candidateKey: string;
  previousUrl: string | null;
  newUrl: string;
  storagePath: string;
  bucket: 'authors' | 'book-covers';
}

export interface ImageRecoveryRollbackPlan {
  generatedAt: string;
  resources: ImageRecoveryRollbackResource[];
  orderedOperations: Array<
    | {
        action: 'restore_db_url';
        entityType: ImageRecoveryApplyOperationType;
        targetId: string;
        previousUrl: string | null;
        candidateKey: string;
      }
    | {
        action: 'delete_storage_path';
        bucket: 'authors' | 'book-covers';
        path: string;
        candidateKey: string;
      }
  >;
  warnings: string[];
}

export interface ImageRecoveryApplyResult {
  generatedAt: string;
  mode: ImageRecoveryApplyMode;
  bookCoversUploaded: number;
  authorPhotosUploaded: number;
  alreadyApplied: number;
  skippedRejected: number;
  manualActionRequired: number;
  technicalRetriesRecovered: number;
  partial: number;
  failed: number;
  blockers: number;
  totalOperationsToApply: number;
  bookCovers: {
    approvedTotal: number;
    algorithmSelections: number;
    editorialManualSelections: number;
    rejected: number;
    manualReview: number;
    readyToApply: number;
    blocked: number;
  };
  authorPhotos: {
    safeReady: number;
    technicalRetries: number;
    alreadyMigrated: number;
    manualOrAmbiguous: number;
    blocked: number;
  };
}

export interface ImageRecoveryApplyPlan {
  generatedAt: string;
  mode: ImageRecoveryApplyMode;
  batchSize: number;
  operations: ImageRecoveryApplyOperation[];
  conflicts: ImageRecoveryApplyConflict[];
  manifest: ImageRecoveryApplyManifest;
  rollbackPlan: ImageRecoveryRollbackPlan;
  result: ImageRecoveryApplyResult;
}
