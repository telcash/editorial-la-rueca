export type AuthorDuplicateClassification =
  'HIGH_CONFIDENCE_DUPLICATE' | 'LIKELY_DUPLICATE' | 'MANUAL_REVIEW' | 'KEEP_SEPARATE';

export interface AuthorDedupeBookRelation {
  bookId: string;
  title: string;
  slug: string;
  isPublished: boolean;
  isArchived: boolean;
}

export interface AuthorDedupeSourceAuthor {
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
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  books: AuthorDedupeBookRelation[];
}

export interface AuthorDedupeAuthor extends AuthorDedupeSourceAuthor {
  normalizedName: string;
  slugBase: string;
  slugNumericSuffix: number | null;
  metadataScore: number;
}

export interface AuthorDedupeFieldProposal {
  field: string;
  proposedValue: string | number | boolean | null;
  sourceAuthorId: string;
  conflict: boolean;
  reason: string;
}

export interface AuthorDedupeRelationSimulation {
  current: Array<{
    authorId: string;
    bookId: string;
    title: string;
    isPublished: boolean;
    isArchived: boolean;
  }>;
  proposedFinal: Array<{
    authorId: string;
    bookId: string;
    title: string;
    sourceAuthorIds: string[];
  }>;
  duplicateRelationsToSkip: Array<{
    bookId: string;
    title: string;
    sourceAuthorIds: string[];
  }>;
}

export interface AuthorDuplicateGroup {
  groupId: string;
  classification: AuthorDuplicateClassification;
  classificationReasons: string[];
  canonicalAuthorId: string;
  canonicalReasons: string[];
  authors: AuthorDedupeAuthor[];
  fieldProposals: AuthorDedupeFieldProposal[];
  relationSimulation: AuthorDedupeRelationSimulation;
  conflicts: string[];
}

export interface AuthorDedupeSummary {
  generatedAt: string;
  totalAuthors: number;
  duplicateGroupsDetected: number;
  affectedAuthors: number;
  highConfidenceDuplicate: number;
  likelyDuplicate: number;
  manualReview: number;
  keepSeparate: number;
  affectedBooks: number;
  groupsWithPhotoConflicts: number;
  groupsWithBiographyConflicts: number;
  relationsToConsolidate: number;
}

export interface AuthorDedupeAudit {
  summary: AuthorDedupeSummary;
  groups: AuthorDuplicateGroup[];
  strategy: string[];
}

export type AuthorDedupeDecision = 'merge' | 'keep_separate' | 'manual_review' | null;

export interface AuthorDedupeSelectedFields {
  name: string;
  slug: string;
  photoUrl: string | null;
  biography: string | null;
  country: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export interface AuthorDedupeDecisionRecord {
  groupId: string;
  classification: AuthorDuplicateClassification;
  decision: AuthorDedupeDecision;
  canonicalAuthorId: string;
  mergeAuthorIds: string[];
  selectedFields: AuthorDedupeSelectedFields;
  fieldConflicts: string[];
  notes: string;
  reviewed: boolean;
  updatedAt: string | null;
}

export interface AuthorDedupeFinalReviewStatistics {
  totalGroups: number;
  proposalOnly: number;
  merge: number;
  keepSeparate: number;
  manualReview: number;
  reviewed: number;
  pendingReview: number;
  highConfidence: number;
  likelyDuplicate: number;
  originalManualReview: number;
  photoConflicts: number;
  biographyConflicts: number;
}

export interface AuthorDedupeFinalReview {
  schemaVersion: 1;
  generatedAt: string;
  decisions: AuthorDedupeDecisionRecord[];
  statistics: AuthorDedupeFinalReviewStatistics;
}
