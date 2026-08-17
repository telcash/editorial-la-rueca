import type { InitialAuthorTestimonial } from '../../../../data/author-testimonials.initial';

export type AuthorMatchStatus =
  'EXACT_AUTHOR_MATCH' | 'LIKELY_AUTHOR_MATCH' | 'AMBIGUOUS_AUTHOR_MATCH' | 'AUTHOR_NOT_FOUND';

export type BookMatchStatus =
  | 'EXACT_BOOK_MATCH'
  | 'LIKELY_BOOK_MATCH'
  | 'AMBIGUOUS_BOOK_MATCH'
  | 'BOOK_NOT_FOUND'
  | 'NO_BOOK_SUGGESTED';

export type SeedPlanStatus =
  'READY_TO_INSERT' | 'MANUAL_REVIEW' | 'BLOCKED' | 'SKIP_ALREADY_EXISTS';

export interface SeedAuthorRow {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  books: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
}

export interface SeedBookRow {
  id: string;
  title: string;
  slug: string;
  authors: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface ExistingTestimonialFingerprint {
  authorId: string;
  normalizedQuote: string;
}

export interface AuthorMatchCandidate extends SeedAuthorRow {
  confidence: number;
  reason: string;
}

export interface BookMatchCandidate extends SeedBookRow {
  confidence: number;
  reason: string;
  authorCompatible: boolean;
}

export interface AuthorMatchResult {
  status: AuthorMatchStatus;
  selectedAuthor: AuthorMatchCandidate | null;
  candidates: AuthorMatchCandidate[];
}

export interface BookMatchResult {
  status: BookMatchStatus;
  selectedBook: BookMatchCandidate | null;
  candidates: BookMatchCandidate[];
}

export interface AuthorTestimonialSeedPlanItem {
  testimonialKey: string;
  index: number;
  sourceName: string;
  quote: string;
  source: 'manual';
  suggestedBookTitle: string | null;
  authorMatch: AuthorMatchResult;
  bookMatch: BookMatchResult;
  status: SeedPlanStatus;
  reasons: string[];
  input: {
    authorId: string | null;
    bookId: string | null;
    quote: string;
    source: 'manual';
    rating: null;
    isPublished: true;
    isFeatured: true;
    sortOrder: number;
  };
}

export type AuthorTestimonialSeedDecisionValue = 'approved' | 'skip' | 'manual_review' | null;

export interface AuthorTestimonialSeedDecision {
  testimonialKey: string;
  sourceName: string;
  selectedAuthorId: string | null;
  selectedBookId: string | null;
  decision: AuthorTestimonialSeedDecisionValue;
  notes: string;
  reviewed: boolean;
}

export interface AuthorTestimonialsSeedSummary {
  total: number;
  exactAuthorMatches: number;
  likelyAuthorMatches: number;
  ambiguousAuthorMatches: number;
  authorsNotFound: number;
  exactBookMatches: number;
  likelyBookMatches: number;
  ambiguousBookMatches: number;
  booksNotFound: number;
  noBookSuggested: number;
  readyToInsert: number;
  manualReview: number;
  blockers: number;
  alreadyExisting: number;
  tableExists: boolean;
}

export interface AuthorTestimonialsSeedConflict {
  severity: 'warning' | 'error';
  code:
    | 'LIKELY_AUTHOR_MATCH'
    | 'AMBIGUOUS_AUTHOR_MATCH'
    | 'AUTHOR_NOT_FOUND'
    | 'LIKELY_BOOK_MATCH'
    | 'AMBIGUOUS_BOOK_MATCH'
    | 'BOOK_NOT_FOUND'
    | 'DECISION_REQUIRED'
    | 'MANUAL_REVIEW_DECISION'
    | 'INVALID_DECISION_AUTHOR'
    | 'INVALID_DECISION_BOOK'
    | 'TABLE_MISSING';
  sourceName: string;
  message: string;
  details: string;
}

export interface AuthorTestimonialsSeedPlan {
  generatedAt: string;
  mode: 'dry-run' | 'preflight' | 'apply';
  tableExists: boolean;
  decisionsEnabled: boolean;
  availableAuthors: SeedAuthorRow[];
  availableBooks: SeedBookRow[];
  items: AuthorTestimonialSeedPlanItem[];
  conflicts: AuthorTestimonialsSeedConflict[];
  summary: AuthorTestimonialsSeedSummary;
}

export interface AuthorTestimonialsSeedResult {
  generatedAt: string;
  total: number;
  inserted: number;
  alreadyExisting: number;
  manual: number;
  failed: number;
  createdIds: string[];
}

export interface PlanAuthorTestimonialsSeedOptions {
  dataset: InitialAuthorTestimonial[];
  authors: SeedAuthorRow[];
  books: SeedBookRow[];
  existingTestimonials: ExistingTestimonialFingerprint[];
  decisions: AuthorTestimonialSeedDecision[] | null;
  tableExists: boolean;
  mode: 'dry-run' | 'preflight' | 'apply';
}
