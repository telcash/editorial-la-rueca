import type { CreateAuthorInput } from '@/schemas/authors/author.schema';
import type { CreateBookInput } from '@/schemas/books/book.schema';

export type MassStatus = 'READY' | 'BLOCKED' | 'MANUAL_REVIEW' | 'SKIPPED';
export type MassCreateAction =
  'AUTO_CREATE' | 'REQUIRES_DUPLICATE_DECISION' | 'MANUAL_REVIEW' | 'SKIP';

export interface MassPlanEntity<TInput> {
  candidateKey: string;
  sourceWpPostId: string;
  action: MassCreateAction;
  status: MassStatus;
  input: TInput;
  blockingReasons: string[];
  warnings: string[];
  resolvedDependencies: Record<string, string | string[] | null>;
  sourceMetadata: Record<string, string | boolean | null>;
}

export type MassAuthorPlan = MassPlanEntity<CreateAuthorInput>;
export type MassBookPlan = MassPlanEntity<CreateBookInput>;

export interface MassRelationPlan {
  bookCandidateKey: string;
  authorCandidateKey: string;
  sourceWpPostId: string;
  action: 'AUTO_CREATE' | 'MANUAL_REVIEW' | 'BLOCKED';
  status: MassStatus;
  confidence: string;
  reason: string;
  blockingReasons: string[];
  warnings: string[];
  resolvedDependencies: Record<string, string | null>;
}

export interface MassEditionPlan {
  bookCandidateKey: string;
  sourceWpPostId: string;
  action: 'AUTO_CREATE' | 'BLOCKED';
  status: MassStatus;
  format: 'paperback';
  editionLabel: string;
  isbn10: null;
  isbn13: null;
  price: null;
  pages: null;
  publicationDate: null;
  inferredEdition: true;
  blockingReasons: string[];
}

export interface MassAuthorImagePlan {
  authorCandidateKey: string;
  sourceWpPostId: string;
  attachmentId: string | null;
  filename: string | null;
  url: string | null;
  status: 'AUTO_UPLOAD' | 'MANUAL_REVIEW' | 'TOO_LARGE' | 'NO_IMAGE';
  confidence: 'high' | 'medium' | 'low' | 'none';
  score: number;
  reasons: string[];
}

export interface MassBookCoverPlan {
  bookCandidateKey: string;
  sourceWpPostId: string;
  attachmentId: string | null;
  filename: string | null;
  url: string | null;
  score: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  status: 'AUTO_UPLOAD_CANDIDATE' | 'MANUAL_REVIEW' | 'NO_AUTO_UPLOAD' | 'NO_COVER';
  reasons: string[];
}

export interface MassConflict {
  code:
    | 'DUPLICATE_AUTHOR_UNRESOLVED'
    | 'DUPLICATE_BOOK_UNRESOLVED'
    | 'INTERNAL_SLUG_CONFLICT'
    | 'MISSING_AUTHOR_MAPPING'
    | 'INVALID_DOMAIN_INPUT';
  entityType: 'author' | 'book' | 'relation';
  candidateKey: string;
  sourceWpPostId: string;
  message: string;
  details: string;
}

export interface RedirectCandidate {
  oldUrl: string;
  targetType: 'author' | 'book';
  targetCandidateKey: string;
  proposedNewPath: string | null;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export interface MassSummary {
  generatedAt: string;
  sources: {
    totalAuthorsCpt: number;
    totalLegacyBookRows: number;
    totalUniqueLegacyBooks: number;
    totalRelationships: number;
    totalAttachments: number;
  };
  authors: {
    totalCandidates: number;
    ready: number;
    duplicateDecision: number;
    manualReview: number;
    skipped: number;
    withSafePhoto: number;
    tooLarge: number;
    noImage: number;
  };
  books: {
    totalCandidates: number;
    ready: number;
    blockedDuplicate: number;
    manualReview: number;
    skipped: number;
    inferredEditions: number;
    highConfidenceCover: number;
    mediumCover: number;
    lowCover: number;
    noCover: number;
  };
  relations: {
    auto: number;
    manual: number;
    blocked: number;
  };
  images: {
    authorPhotosSafe: number;
    bookCoversHigh: number;
    manualReview: number;
    tooLarge: number;
  };
  blockers: number;
  manualReview: {
    total: number;
    authorDuplicates: number;
    bookDuplicates: number;
    authorImages: number;
    bookCovers: number;
    unmodeledFields: number;
  };
  redirects: number;
}

export interface MassPlan {
  generatedAt: string;
  mode: 'dry-run';
  authors: MassAuthorPlan[];
  books: MassBookPlan[];
  relations: MassRelationPlan[];
  editions: MassEditionPlan[];
  authorImages: MassAuthorImagePlan[];
  bookCovers: MassBookCoverPlan[];
  conflicts: MassConflict[];
  manualReview: Record<string, unknown>;
  redirects: RedirectCandidate[];
  summary: MassSummary;
  decisionsTemplate: Record<string, unknown>;
}
