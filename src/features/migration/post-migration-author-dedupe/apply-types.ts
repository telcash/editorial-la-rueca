import type { AuthorDedupeDecisionRecord, AuthorDedupeSelectedFields } from './types';

export type AuthorDedupeApplyMode = 'dry-run' | 'preflight' | 'apply';
export type AuthorDedupeApplyStatus = 'planned' | 'in_progress' | 'applied' | 'partial' | 'failed';
export type AuthorDedupeApplyCheckpoint =
  | 'planned'
  | 'started'
  | 'relations_reconciled'
  | 'canonical_updated'
  | 'duplicates_archived'
  | 'complete'
  | 'failed';

export type AuthorDedupeConflictSeverity = 'warning' | 'error';

export interface AuthorDedupeApplyConflict {
  code:
    | 'CANONICAL_MISSING'
    | 'DUPLICATE_MISSING'
    | 'INVALID_DECISION'
    | 'INCOMPLETE_DECISION'
    | 'OVERLAPPING_DUPLICATE'
    | 'CANONICAL_USED_AS_DUPLICATE'
    | 'CANONICAL_ARCHIVED'
    | 'DUPLICATE_ALREADY_ARCHIVED'
    | 'SLUG_COLLISION'
    | 'FINGERPRINT_MISMATCH'
    | 'RELATION_INCONSISTENCY'
    | 'APPLY_ALREADY_STARTED'
    | 'MISSING_MANIFEST_FOR_RESUME';
  severity: AuthorDedupeConflictSeverity;
  groupId: string;
  authorId: string | null;
  message: string;
  details: string;
}

export interface AuthorDedupeAuthorSnapshot {
  id: string;
  name: string;
  slug: string;
  shortBio: string | null;
  biography: string | null;
  photoUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  country: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorDedupeRelationSnapshot {
  bookId: string;
  authorId: string;
  sortOrder: number;
  createdAt: string;
  bookTitle: string;
  bookSlug: string;
  bookExists: boolean;
}

export interface AuthorDedupeRelationMove {
  bookId: string;
  title: string;
  fromAuthorId: string;
  toAuthorId: string;
  sortOrder: number;
}

export interface AuthorDedupeSkippedRelation {
  bookId: string;
  title: string;
  fromAuthorId: string;
  existingAuthorId: string;
  reason: 'canonical_relation_exists' | 'already_moved_by_duplicate';
}

export interface AuthorDedupeApplyGroupPlan {
  groupId: string;
  decision: AuthorDedupeDecisionRecord;
  canonicalAuthor: AuthorDedupeAuthorSnapshot | null;
  duplicates: AuthorDedupeAuthorSnapshot[];
  missingDuplicateAuthorIds: string[];
  selectedFields: Partial<AuthorDedupeSelectedFields>;
  currentRelations: AuthorDedupeRelationSnapshot[];
  finalRelations: Array<{
    bookId: string;
    title: string;
    authorId: string;
    sourceAuthorIds: string[];
    sortOrder: number;
  }>;
  relationsToMove: AuthorDedupeRelationMove[];
  relationsSkippedAsDuplicate: AuthorDedupeSkippedRelation[];
  authorsToArchive: string[];
  conflicts: AuthorDedupeApplyConflict[];
}

export interface AuthorDedupeApplyManifestEntry {
  groupId: string;
  canonicalAuthorId: string;
  duplicateAuthorIds: string[];
  status: AuthorDedupeApplyStatus;
  checkpoint: AuthorDedupeApplyCheckpoint;
  relationsMoved: number;
  relationsSkippedAsDuplicate: number;
  canonicalUpdated: boolean;
  duplicatesArchived: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  error: string | null;
}

export interface AuthorDedupeApplyManifest {
  generatedAt: string;
  mode: AuthorDedupeApplyMode;
  planFingerprint: string;
  currentBatchIndex: number;
  completedBatches: number[];
  entries: AuthorDedupeApplyManifestEntry[];
}

export interface AuthorDedupeRollbackGroup {
  groupId: string;
  rollbackOrder: [
    'restore_duplicate_authors',
    'restore_original_relations',
    'delete_created_canonical_relations',
    'restore_canonical_author',
  ];
  canonicalBefore: AuthorDedupeAuthorSnapshot | null;
  duplicatesBefore: AuthorDedupeAuthorSnapshot[];
  originalRelations: AuthorDedupeRelationSnapshot[];
  createdRelations: AuthorDedupeRelationMove[];
}

export interface AuthorDedupeRollbackPlan {
  generatedAt: string;
  planFingerprint: string;
  groups: AuthorDedupeRollbackGroup[];
  notes: string[];
}

export interface AuthorDedupeApplyResult {
  generatedAt: string;
  groupsPlanned: number;
  groupsApplied: number;
  groupsSkipped: number;
  groupsFailed: number;
  canonicalAuthorsUpdated: number;
  duplicateAuthorsArchived: number;
  relationsMoved: number;
  duplicateRelationsAvoided: number;
  partial: number;
  failed: number;
}

export interface AuthorDedupeApplyPlan {
  generatedAt: string;
  mode: AuthorDedupeApplyMode;
  planFingerprint: string;
  decisionsFile: string;
  batchSize: number;
  groups: AuthorDedupeApplyGroupPlan[];
  conflicts: AuthorDedupeApplyConflict[];
  manifest: AuthorDedupeApplyManifest;
  rollbackPlan: AuthorDedupeRollbackPlan;
  result: AuthorDedupeApplyResult;
  summary: {
    approvedGroups: number;
    skippedDecisionGroups: number;
    canonicalAuthors: number;
    duplicateAuthorsToArchive: number;
    relationsToMove: number;
    duplicateRelationsToAvoid: number;
    conflicts: number;
    blockers: number;
  };
}

export interface AuthorDedupeApplyExecutionStats {
  relationsMoved: number;
  relationsSkippedAsDuplicate: number;
  canonicalUpdated: boolean;
  duplicatesArchived: number;
}
