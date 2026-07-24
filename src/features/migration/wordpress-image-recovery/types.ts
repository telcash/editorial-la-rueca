export type ImageRecoveryMode = 'analyze' | 'dry-run';

export type RecoveryCategory =
  'technical_retry' | 'safe_author_photo' | 'safe_book_cover' | 'ambiguous' | 'no_candidate';

export type RecoveryDecision =
  'retry_with_transform' | 'upload_author_photo' | 'upload_book_cover' | 'manual_review' | 'skip';

export type TechnicalImageErrorCode =
  'IMAGE_TOO_LARGE' | 'DOWNLOAD_FAILED' | 'INVALID_MIME' | 'UPLOAD_FAILED';

export interface RecoveryImageCandidate {
  attachmentId: string | null;
  url: string | null;
  filename: string | null;
  title: string | null;
  origin: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  signals: string[];
}

export interface RecoveryTransformPlan {
  required: boolean;
  format: 'jpeg' | 'webp' | null;
  maxWidth: number | null;
  maxHeight: number | null;
  quality: number | null;
  correctExifOrientation: boolean;
  reason: string | null;
}

export interface RecoveryPlanItem {
  entityType: 'author' | 'book';
  candidateKey: string;
  sourceWpPostId: string;
  targetId: string | null;
  title: string;
  category: RecoveryCategory;
  decision: RecoveryDecision;
  confidence: 'high' | 'medium' | 'low' | 'none';
  migrationErrorCode: TechnicalImageErrorCode | null;
  candidate: RecoveryImageCandidate | null;
  transform: RecoveryTransformPlan;
  reasons: string[];
  alreadyApplied: boolean;
}

export interface ImageRecoveryManifestEntry {
  candidateKey: string;
  entityType: 'author' | 'book';
  sourceWpPostId: string;
  targetId: string | null;
  status: 'planned' | 'skipped' | 'manual_action_required' | 'applied';
  category: RecoveryCategory;
  decision: RecoveryDecision;
  candidateUrl: string | null;
}

export interface ImageRecoveryManifest {
  generatedAt: string;
  mode: ImageRecoveryMode;
  batchSize: number;
  entries: ImageRecoveryManifestEntry[];
}

export interface ImageRecoveryResult {
  generatedAt: string;
  mode: ImageRecoveryMode;
  totalPending: number;
  technicalRetry: number;
  safeAuthorPhoto: number;
  safeBookCover: number;
  ambiguous: number;
  noCandidate: number;
  automaticallyRecoverable: number;
  applied: 0;
  skippedAlreadyApplied: number;
}

export interface ImageRecoveryPlan {
  generatedAt: string;
  mode: ImageRecoveryMode;
  xmlSource: string | null;
  batchSize: number;
  items: RecoveryPlanItem[];
  result: ImageRecoveryResult;
  manifest: ImageRecoveryManifest;
}

export interface ImageRecoveryInputPaths {
  massApplyDirectory: string;
  auditDirectory: string;
  outputDirectory: string;
  xmlInputPath?: string;
}
