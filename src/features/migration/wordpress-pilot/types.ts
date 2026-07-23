import type { CreateAuthorInput } from '@/schemas/authors/author.schema';
import type { BookEditionInput, CreateBookInput } from '@/schemas/books/book.schema';

export type PilotBookInput = Omit<CreateBookInput, 'authorIds' | 'editions'> & {
  authorCandidateKeys: string[];
  editions: BookEditionInput[];
};

export interface PilotSampleCase {
  kind: string;
  reason: string;
  sourceWpPostId: string;
  authorCandidateKey?: string;
  bookCandidateKey?: string;
  title: string;
}

export interface PilotSample {
  generatedAt: string;
  cases: PilotSampleCase[];
}

export interface PilotAuthorCandidate {
  candidateKey: string;
  sourceWpPostId: string;
  name: string;
  normalizedName: string;
  slug: string;
  normalizedSlug: string;
  oldUrl: string;
  rawReview: string;
  plainTextPreview: string;
  bioCandidate: string;
  thumbnailId: string;
  thumbnailUrl: string;
  imageFieldId: string;
  imageFieldUrl: string;
  status: string;
  classification: string;
  classificationReasons: string;
  possibleDuplicateGroup: string;
  reviewLikelyType: string;
  reviewConfidence: string;
  yoastMetaTitle: string;
  yoastMetaDescription: string;
  canonicalUrl: string;
}

export interface PilotBookCandidate {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  normalizedTitle: string;
  sourceAuthorTitle: string;
  sourceAuthorSlug: string;
  sourceOldUrl: string;
  rawReview: string;
  plainTextPreview: string;
  videoId: string;
  thumbnailId: string;
  thumbnailUrl: string;
  duplicateGroupId: string;
}

export interface PilotRelationshipCandidate {
  bookCandidateKey: string;
  authorCandidateKey: string;
  sourceWpPostId: string;
  confidence: string;
  reason: string;
}

export interface PilotAttachmentCandidate {
  wpPostId: string;
  title: string;
  slug: string;
  url: string;
  parentId: string;
  mimeType: string;
  width: string;
  height: string;
  attachedFile: string;
}

export interface PilotIssueCandidate {
  severity: string;
  code: string;
  entityType: string;
  sourceWpPostId: string;
  candidateKey: string;
  message: string;
  details: string;
}

export interface PilotDecisions {
  bookDuplicateGroups?: Record<
    string,
    {
      action: 'merge' | 'skip';
      canonicalCandidateKey?: string;
      mergeAuthorRelations?: boolean;
    }
  >;
  authorDuplicateGroups?: Record<
    string,
    {
      action: 'keep_separate' | 'merge';
      canonicalCandidateKey?: string;
    }
  >;
  slugConflicts?: Record<
    string,
    {
      action: 'skip' | 'use_slug';
      slug?: string;
    }
  >;
}

export interface PilotAuditData {
  sample: PilotSample;
  authors: PilotAuthorCandidate[];
  books: PilotBookCandidate[];
  relationships: PilotRelationshipCandidate[];
  attachments: PilotAttachmentCandidate[];
  issues: PilotIssueCandidate[];
  decisions: PilotDecisions;
}

export interface PilotPlanAuthor {
  candidateKey: string;
  sourceWpPostId: string;
  input: CreateAuthorInput;
  warnings: string[];
  sourceMetadata: Record<string, string | boolean | null>;
  image: PilotImagePlan;
  status: 'planned' | 'blocked' | 'skipped';
}

export interface PilotPlanBook {
  candidateKey: string;
  sourceWpPostId: string;
  input: PilotBookInput;
  warnings: string[];
  requiresManualMergeDecision: boolean;
  sourceMetadata: Record<string, string | boolean | null>;
  image: PilotImagePlan;
  status: 'planned' | 'blocked' | 'skipped';
}

export interface PilotPlanRelation {
  bookCandidateKey: string;
  authorCandidateKey: string;
  sourceWpPostId: string;
  confidence: string;
  reason: string;
  status: 'planned' | 'blocked' | 'skipped';
  warnings: string[];
}

export interface PilotPlanEdition {
  bookCandidateKey: string;
  editionLabel: string;
  format: 'paperback';
  inferredEdition: true;
  status: 'planned' | 'blocked' | 'skipped';
}

export interface PilotImagePlan {
  candidateKey: string;
  entityType: 'author' | 'book';
  sourceWpPostId: string;
  attachmentUrl: string;
  role: 'safe_author_photo' | 'safe_book_cover' | 'ambiguous' | 'none';
  status: 'planned' | 'skipped' | 'blocked';
  reason: string;
  targetPublicUrl?: string;
  targetPath?: string;
}

export interface PilotPlanIssue {
  severity: 'info' | 'warning' | 'error';
  code: string;
  candidateKey: string;
  sourceWpPostId: string;
  message: string;
  details: string;
}

export interface PilotManifestEntry {
  sourceType: 'author' | 'book' | 'relation' | 'edition' | 'image';
  sourceWpPostId: string;
  candidateKey: string;
  targetEntityType: string;
  targetId: string | null;
  status: 'planned' | 'applied' | 'partial' | 'skipped' | 'failed';
  warnings: string[];
  sourceMetadata: Record<string, string | boolean | null>;
  imageStatus: string;
  checkpoint?: string;
  createdAt: string;
  inferredEdition?: boolean;
}

export interface PilotManifest {
  generatedAt: string;
  auditSource: string;
  entries: PilotManifestEntry[];
}

export interface PilotPlan {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  authors: PilotPlanAuthor[];
  books: PilotPlanBook[];
  relations: PilotPlanRelation[];
  editions: PilotPlanEdition[];
  images: PilotImagePlan[];
  issues: PilotPlanIssue[];
  manifest: PilotManifest;
}

export interface PilotResult {
  generatedAt: string;
  planned: number;
  createdAuthors: number;
  createdBooks: number;
  createdRelations: number;
  createdEditions: number;
  uploadedAuthorImages: number;
  uploadedBookCovers: number;
  skipped: number;
  partial: number;
  failed: number;
  issues: PilotPlanIssue[];
}
