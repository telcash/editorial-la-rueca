import type { CreateAuthorInput } from '@/schemas/authors/author.schema';
import type { BookEditionInput, CreateBookInput } from '@/schemas/books/book.schema';

export type MassApplyStatus =
  'READY' | 'MANUAL_REVIEW' | 'SKIPPED' | 'BLOCKED' | 'REUSED_FROM_PILOT';

export type MassApplyManifestStatus =
  'planned' | 'applied' | 'partial' | 'failed' | 'skipped' | 'manual_action_required';

export type MassApplyCheckpoint =
  | 'planned'
  | 'pilot_reconciled'
  | 'author_created'
  | 'book_created'
  | 'edition_created'
  | 'relation_created'
  | 'author_image_uploaded'
  | 'book_cover_uploaded'
  | 'complete'
  | 'manual_action_required'
  | 'skipped';

export interface MassApplyAuthorPlan {
  candidateKey: string;
  sourceWpPostId: string;
  status: MassApplyStatus;
  action: 'CREATE' | 'REUSE_PILOT' | 'SKIP' | 'MANUAL_REVIEW' | 'BLOCK';
  input: CreateAuthorInput;
  originalSlug: string;
  resolvedSlug: string;
  strategy: 'PRESERVE' | 'PRESERVE_SEPARATE_PENDING_DEDUPLICATION';
  needsAuthorDeduplication: boolean;
  pilotTargetId: string | null;
  warnings: string[];
  blockingReasons: string[];
  sourceMetadata: Record<string, string | boolean | null>;
}

export interface MassApplyBookPlan {
  candidateKey: string;
  sourceWpPostId: string;
  status: MassApplyStatus;
  action: 'CREATE' | 'REUSE_PILOT' | 'SKIP' | 'MANUAL_REVIEW' | 'BLOCK';
  input: CreateBookInput;
  authorCandidateKeys: string[];
  pilotTargetId: string | null;
  warnings: string[];
  blockingReasons: string[];
  sourceMetadata: Record<string, string | boolean | null>;
}

export interface MassApplyRelationPlan {
  relationKey: string;
  bookCandidateKey: string;
  authorCandidateKey: string;
  sourceWpPostId: string;
  status: MassApplyStatus;
  action: 'CREATE' | 'SKIP' | 'MANUAL_REVIEW' | 'BLOCK';
  confidence: string;
  reason: string;
  warnings: string[];
  blockingReasons: string[];
}

export interface MassApplyEditionPlan {
  bookCandidateKey: string;
  sourceWpPostId: string;
  status: MassApplyStatus;
  action: 'CREATE' | 'REUSE_PILOT' | 'SKIP' | 'BLOCK';
  edition: BookEditionInput;
  inferredEdition: true;
  warnings: string[];
  blockingReasons: string[];
}

export interface MassApplyImagePlan {
  candidateKey: string;
  entityType: 'author' | 'book';
  sourceWpPostId: string;
  attachmentId: string | null;
  filename: string | null;
  url: string | null;
  status: MassApplyStatus | 'TOO_LARGE' | 'NO_IMAGE' | 'NO_COVER';
  action: 'UPLOAD' | 'SKIP' | 'MANUAL_REVIEW';
  confidence: string;
  reasons: string[];
}

export interface MassApplyManifestEntry {
  candidateKey: string;
  entityType: 'author' | 'book' | 'relation' | 'edition' | 'author_image' | 'book_cover';
  sourceWpPostId: string;
  targetId: string | null;
  status: MassApplyManifestStatus;
  checkpoint: MassApplyCheckpoint;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
  sourceMetadata: Record<string, string | boolean | null>;
  preexisting: boolean;
}

export interface MassApplyManifest {
  generatedAt: string;
  mode: 'dry-run' | 'preflight' | 'apply';
  entries: MassApplyManifestEntry[];
}

export interface MassApplyRollbackPlan {
  generatedAt: string;
  resources: {
    authors: Array<{ id: string; candidateKey: string; preexisting: boolean }>;
    books: Array<{ id: string; candidateKey: string; preexisting: boolean }>;
    editions: Array<{ id: string; candidateKey: string; preexisting: boolean }>;
    relations: Array<{
      bookId: string;
      authorId: string;
      candidateKey: string;
      preexisting: boolean;
    }>;
    storagePaths: Array<{
      path: string;
      bucket: string;
      candidateKey: string;
      preexisting: boolean;
    }>;
  };
  warnings: string[];
}

export interface MassApplyResult {
  generatedAt: string;
  authorsCreated: number;
  authorsReusedFromPilot: number;
  booksCreated: number;
  booksReusedFromPilot: number;
  editionsCreated: number;
  relationsCreated: number;
  authorImagesUploaded: number;
  bookCoversUploaded: number;
  skipped: number;
  manualActionRequired: number;
  partial: number;
  failed: number;
}

export interface MassApplyBatch {
  index: number;
  entityType: 'author' | 'book' | 'relation' | 'edition' | 'image';
  candidateKeys: string[];
}

export interface AuthorDeduplicationMapGroup {
  duplicateGroup: string;
  legacyCandidateKeys: string[];
  targetIds: Record<string, string | null>;
  proposedCanonical: string | null;
  associatedBooks: Record<string, string[]>;
  photoConflicts: boolean;
  biographyConflicts: boolean;
}

export interface MassApplyConflict {
  code:
    | 'BOOK_SKIPPED_MANUAL_REVIEW'
    | 'SLUG_COLLISION'
    | 'MISSING_DEPENDENCY'
    | 'TOTAL_RECONCILIATION_FAILED'
    | 'BACKUP_REQUIRED_BEFORE_APPLY'
    | 'PREFLIGHT_DB_UNAVAILABLE'
    | 'EXISTING_SLUG_WITHOUT_MANIFEST';
  severity: 'warning' | 'error';
  entityType: 'author' | 'book' | 'relation' | 'edition' | 'image' | 'runtime';
  candidateKey: string;
  message: string;
  details: string;
}

export interface MassApplyPlan {
  generatedAt: string;
  mode: 'dry-run' | 'preflight' | 'apply';
  batchSize: number;
  authors: MassApplyAuthorPlan[];
  books: MassApplyBookPlan[];
  relations: MassApplyRelationPlan[];
  editions: MassApplyEditionPlan[];
  authorImages: MassApplyImagePlan[];
  bookCovers: MassApplyImagePlan[];
  batches: MassApplyBatch[];
  conflicts: MassApplyConflict[];
  manifest: MassApplyManifest;
  result: MassApplyResult;
  rollbackPlan: MassApplyRollbackPlan;
  authorDeduplicationMap: AuthorDeduplicationMapGroup[];
  summary: {
    authorsTotal: number;
    authorsToCreate: number;
    authorsReusedFromPilot: number;
    duplicateAuthorRecordsPreserved: number;
    validBooksTotal: number;
    booksToCreate: number;
    booksReusedFromPilot: number;
    booksSkipped: number;
    relationsReady: number;
    relationsSkipped: number;
    editionsReady: number;
    authorImagesReady: number;
    authorImagesManualOrNoImage: number;
    bookCoversReady: number;
    bookCoversManualLowNoCover: number;
    batches: number;
    pilotMappingsReconciled: number;
    blockers: number;
    backupRequiredBeforeApply: boolean;
  };
}
