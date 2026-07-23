export interface WordPressMeta {
  key: string;
  value: string;
}

export interface WordPressTerm {
  domain: string;
  nicename: string;
  name: string;
}

export interface WordPressItem {
  wpPostId: string;
  title: string;
  slug: string;
  status: string;
  postType: string;
  oldUrl: string;
  createdAt: string;
  modifiedAt: string;
  content: string;
  excerpt: string;
  guid: string;
  metas: WordPressMeta[];
  terms: WordPressTerm[];
}

export interface WordPressChannel {
  wxrVersion: string;
  siteUrl: string;
  items: WordPressItem[];
}

export interface AttachmentCandidate {
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

export type AuthorClassification =
  'legacy_author_book_combined' | 'author_only_candidate' | 'ambiguous';

export type ReviewLikelyType = 'book_synopsis' | 'author_bio' | 'ambiguous';

export interface AuthorCandidate {
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
  classification: AuthorClassification;
  classificationReasons: string;
  possibleDuplicateGroup: string;
  reviewLikelyType: ReviewLikelyType;
  reviewConfidence: string;
  yoastMetaTitle: string;
  yoastMetaDescription: string;
  canonicalUrl: string;
}

export interface BookCandidate {
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

export interface RelationshipCandidate {
  bookCandidateKey: string;
  authorCandidateKey: string;
  sourceWpPostId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface Issue {
  severity: 'warning' | 'error' | 'info';
  code: string;
  entityType: string;
  sourceWpPostId: string;
  candidateKey: string;
  message: string;
  details: string;
}

export interface AcfBookField {
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  defaultValue: string;
}

export interface WooCommerceProduct {
  wpPostId: string;
  title: string;
  slug: string;
  status: string;
  sku: string;
  price: string;
  regularPrice: string;
  externalUrl: string;
  productType: string;
  thumbnailId: string;
}

export interface MigrationReport {
  generatedAt: string;
  sourceFile: string;
  sourceSizeBytes: number;
  wxrVersion: string;
  siteUrl: string;
  countsByPostType: Record<string, number>;
  countsByStatus: Record<string, number>;
  totalAttachments: number;
  totalAutoresCpt: number;
  totalLibrosCpt: number;
  totalPages: number;
  totalWooCommerceProducts: number;
  frequentMetaKeysByPostType: Record<string, Array<{ key: string; count: number }>>;
  taxonomiesDetected: {
    editorial: Array<{ taxonomy: string; term: string; slug: string; count: number }>;
    pluginOrSystem: Array<{ taxonomy: string; term: string; slug: string; count: number }>;
    notSuitableForAutomaticCategoryMigration: Array<{
      taxonomy: string;
      term: string;
      slug: string;
      reason: string;
    }>;
  };
  statistics: {
    wpAuthors: number;
    authorsWithTfLibro: number;
    authorsWithoutTfLibro: number;
    authorClassificationCounts: Record<AuthorClassification, number>;
    uniqueBookCandidates: number;
    duplicatedBookTitles: number;
    recordsWithVideo: number;
    recordsWithThumbnail: number;
    recordsWithImagenDestacada2: number;
    recordsWithYoastMetaDescription: number;
    resolvedAttachmentReferences: number;
    brokenImageReferences: number;
    possibleDuplicateAuthors: number;
  };
  acfBookFieldsDetected: AcfBookField[];
  warnings: string[];
  woocommerceAudit: {
    totalProducts: number;
    products: WooCommerceProduct[];
  };
}

export interface ModelGapField {
  sourceField: string;
  targetModel: string;
  classification:
    'DIRECT_MAP' | 'DERIVED_MAP' | 'MANUAL_REVIEW' | 'NOT_CURRENTLY_MODELED' | 'IGNORE_SYSTEM';
  notes: string;
}

export interface AuditResult {
  report: MigrationReport;
  authors: AuthorCandidate[];
  books: BookCandidate[];
  relationships: RelationshipCandidate[];
  attachments: AttachmentCandidate[];
  issues: Issue[];
  modelGapAnalysis: ModelGapField[];
  postTypes: Array<{ postType: string; count: number }>;
  pilotSample: {
    generatedAt: string;
    cases: Array<{
      kind: string;
      reason: string;
      sourceWpPostId: string;
      authorCandidateKey?: string;
      bookCandidateKey?: string;
      title: string;
    }>;
  };
}
