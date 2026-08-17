import type {
  AuthorMatchCandidate,
  AuthorMatchResult,
  AuthorTestimonialsSeedConflict,
  AuthorTestimonialsSeedPlan,
  AuthorTestimonialSeedDecision,
  AuthorTestimonialSeedPlanItem,
  BookMatchCandidate,
  BookMatchResult,
  PlanAuthorTestimonialsSeedOptions,
  SeedAuthorRow,
  SeedBookRow,
} from './types';
import { createTestimonialKey } from './decisions';
import {
  expandObviousNameAbbreviations,
  getTokenOverlapRatio,
  normalizeForMatch,
  normalizeQuoteFingerprint,
  normalizeSlugComparison,
  normalizeWhitespace,
} from './normalize';

export function planAuthorTestimonialsSeed({
  dataset,
  authors,
  books,
  existingTestimonials,
  decisions,
  tableExists,
  mode,
}: PlanAuthorTestimonialsSeedOptions): AuthorTestimonialsSeedPlan {
  const decisionsByKey = new Map(decisions?.map((decision) => [decision.testimonialKey, decision]));

  const items = dataset.map((entry, itemIndex) => {
    const quote = normalizeWhitespace(entry.quote);
    const testimonialKey = createTestimonialKey(itemIndex + 1, entry.sourceName, quote);
    const authorMatch = matchAuthor(entry.sourceName, authors);
    const bookMatch = matchBook(entry.suggestedBookTitle, authorMatch.selectedAuthor, books);
    const decision = decisionsByKey.get(testimonialKey) ?? null;
    const selectedDecisionAuthor = decision?.selectedAuthorId
      ? (authors.find((author) => author.id === decision.selectedAuthorId) ?? null)
      : null;
    const selectedDecisionBook = decision?.selectedBookId
      ? (books.find((book) => book.id === decision.selectedBookId) ?? null)
      : null;
    const inputAuthorId = decisions
      ? (selectedDecisionAuthor?.id ?? null)
      : (authorMatch.selectedAuthor?.id ?? null);
    const inputBookId = decisions
      ? (selectedDecisionBook?.id ?? null)
      : (bookMatch.selectedBook?.id ?? null);
    const alreadyExists =
      inputAuthorId !== null &&
      existingTestimonials.some(
        (testimonial) =>
          testimonial.authorId === inputAuthorId &&
          testimonial.normalizedQuote === normalizeQuoteFingerprint(quote),
      );
    const reasons: string[] = [];

    if (authorMatch.status !== 'EXACT_AUTHOR_MATCH') {
      reasons.push(authorMatch.status);
    }

    if (bookMatch.status !== 'EXACT_BOOK_MATCH' && bookMatch.status !== 'NO_BOOK_SUGGESTED') {
      reasons.push(bookMatch.status);
    }

    if (alreadyExists) {
      reasons.push('SKIP_ALREADY_EXISTS');
    }

    const decisionIssue = getDecisionIssue(decision, selectedDecisionAuthor, selectedDecisionBook);

    if (decisions && decisionIssue) {
      reasons.push(decisionIssue);
    }

    const status = decisions
      ? getDecisionItemStatus(decision, selectedDecisionAuthor, selectedDecisionBook, alreadyExists)
      : getItemStatus(authorMatch.status, bookMatch.status, alreadyExists);

    return {
      testimonialKey,
      index: itemIndex + 1,
      sourceName: entry.sourceName,
      quote,
      source: entry.source,
      suggestedBookTitle: entry.suggestedBookTitle ?? null,
      authorMatch,
      bookMatch,
      status,
      reasons,
      input: {
        authorId: inputAuthorId,
        bookId: inputBookId,
        quote,
        source: 'manual',
        rating: null,
        isPublished: true,
        isFeatured: true,
        sortOrder: itemIndex + 1,
      },
    } satisfies AuthorTestimonialSeedPlanItem;
  });
  const conflicts = buildConflicts(items, tableExists, decisions !== null);
  const summary = {
    total: items.length,
    exactAuthorMatches: countBy(items, (item) => item.authorMatch.status === 'EXACT_AUTHOR_MATCH'),
    likelyAuthorMatches: countBy(
      items,
      (item) => item.authorMatch.status === 'LIKELY_AUTHOR_MATCH',
    ),
    ambiguousAuthorMatches: countBy(
      items,
      (item) => item.authorMatch.status === 'AMBIGUOUS_AUTHOR_MATCH',
    ),
    authorsNotFound: countBy(items, (item) => item.authorMatch.status === 'AUTHOR_NOT_FOUND'),
    exactBookMatches: countBy(items, (item) => item.bookMatch.status === 'EXACT_BOOK_MATCH'),
    likelyBookMatches: countBy(items, (item) => item.bookMatch.status === 'LIKELY_BOOK_MATCH'),
    ambiguousBookMatches: countBy(
      items,
      (item) => item.bookMatch.status === 'AMBIGUOUS_BOOK_MATCH',
    ),
    booksNotFound: countBy(items, (item) => item.bookMatch.status === 'BOOK_NOT_FOUND'),
    noBookSuggested: countBy(items, (item) => item.bookMatch.status === 'NO_BOOK_SUGGESTED'),
    readyToInsert: countBy(items, (item) => item.status === 'READY_TO_INSERT'),
    manualReview: countBy(items, (item) => item.status === 'MANUAL_REVIEW'),
    blockers: countBy(items, (item) => item.status === 'BLOCKED') + (tableExists ? 0 : 1),
    alreadyExisting: countBy(items, (item) => item.status === 'SKIP_ALREADY_EXISTS'),
    tableExists,
  };

  return {
    generatedAt: new Date().toISOString(),
    mode,
    tableExists,
    decisionsEnabled: decisions !== null,
    availableAuthors: authors,
    availableBooks: books,
    items,
    conflicts,
    summary,
  };
}

export function matchAuthor(sourceName: string, authors: SeedAuthorRow[]): AuthorMatchResult {
  const normalizedSource = normalizeForMatch(sourceName);
  const expandedSource = expandObviousNameAbbreviations(sourceName);
  const sourceSlug = normalizeSlugComparison(sourceName);
  const exactCandidates: AuthorMatchCandidate[] = [];
  const likelyCandidates: AuthorMatchCandidate[] = [];

  for (const author of authors) {
    const normalizedAuthor = normalizeForMatch(author.name);
    const expandedAuthor = expandObviousNameAbbreviations(author.name);
    const authorSlug = normalizeSlugComparison(author.slug);

    if (
      normalizedSource === normalizedAuthor ||
      expandedSource === expandedAuthor ||
      sourceSlug === authorSlug
    ) {
      exactCandidates.push({
        ...author,
        confidence: 1,
        reason: 'Normalized name or slug matches exactly.',
      });
      continue;
    }

    const overlap = Math.max(
      getTokenOverlapRatio(normalizedSource, normalizedAuthor),
      getTokenOverlapRatio(expandedSource, expandedAuthor),
    );
    const containsName =
      normalizedAuthor.includes(normalizedSource) ||
      normalizedSource.includes(normalizedAuthor) ||
      expandedAuthor.includes(expandedSource) ||
      expandedSource.includes(expandedAuthor);

    if (containsName || overlap >= 0.75) {
      likelyCandidates.push({
        ...author,
        confidence: containsName ? 0.86 : overlap,
        reason: containsName ? 'One normalized name contains the other.' : 'High token overlap.',
      });
    }
  }

  if (exactCandidates.length === 1) {
    return {
      status: 'EXACT_AUTHOR_MATCH',
      selectedAuthor: exactCandidates[0] ?? null,
      candidates: exactCandidates,
    };
  }

  if (exactCandidates.length > 1) {
    return {
      status: 'AMBIGUOUS_AUTHOR_MATCH',
      selectedAuthor: null,
      candidates: exactCandidates,
    };
  }

  if (likelyCandidates.length === 1) {
    return {
      status: 'LIKELY_AUTHOR_MATCH',
      selectedAuthor: likelyCandidates[0] ?? null,
      candidates: likelyCandidates,
    };
  }

  if (likelyCandidates.length > 1) {
    return {
      status: 'AMBIGUOUS_AUTHOR_MATCH',
      selectedAuthor: null,
      candidates: likelyCandidates,
    };
  }

  return {
    status: 'AUTHOR_NOT_FOUND',
    selectedAuthor: null,
    candidates: [],
  };
}

export function matchBook(
  suggestedBookTitle: string | undefined,
  selectedAuthor: AuthorMatchCandidate | null,
  books: SeedBookRow[],
): BookMatchResult {
  if (!suggestedBookTitle) {
    return {
      status: 'NO_BOOK_SUGGESTED',
      selectedBook: null,
      candidates: [],
    };
  }

  const normalizedTitle = normalizeForMatch(suggestedBookTitle);
  const titleSlug = normalizeSlugComparison(suggestedBookTitle);
  const exactTitleCandidates: BookMatchCandidate[] = [];
  const likelyTitleCandidates: BookMatchCandidate[] = [];

  for (const book of books) {
    const normalizedBookTitle = normalizeForMatch(book.title);
    const bookSlug = normalizeSlugComparison(book.slug);
    const authorCompatible =
      selectedAuthor === null || book.authors.some((author) => author.id === selectedAuthor.id);

    if (normalizedTitle === normalizedBookTitle || titleSlug === bookSlug) {
      exactTitleCandidates.push({
        ...book,
        confidence: authorCompatible ? 1 : 0.7,
        reason: authorCompatible
          ? 'Normalized title matches and author is compatible.'
          : 'Normalized title matches but author compatibility is not confirmed.',
        authorCompatible,
      });
      continue;
    }

    const overlap = getTokenOverlapRatio(normalizedTitle, normalizedBookTitle);

    if (
      normalizedBookTitle.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedBookTitle) ||
      overlap >= 0.8
    ) {
      likelyTitleCandidates.push({
        ...book,
        confidence: authorCompatible ? Math.max(0.8, overlap) : Math.max(0.6, overlap),
        reason: authorCompatible
          ? 'Title is similar and author is compatible.'
          : 'Title is similar but author compatibility is not confirmed.',
        authorCompatible,
      });
    }
  }

  const compatibleExact = exactTitleCandidates.filter((candidate) => candidate.authorCompatible);

  if (compatibleExact.length === 1) {
    return {
      status: 'EXACT_BOOK_MATCH',
      selectedBook: compatibleExact[0] ?? null,
      candidates: exactTitleCandidates,
    };
  }

  if (exactTitleCandidates.length > 0) {
    return {
      status: exactTitleCandidates.length === 1 ? 'LIKELY_BOOK_MATCH' : 'AMBIGUOUS_BOOK_MATCH',
      selectedBook: exactTitleCandidates.length === 1 ? (exactTitleCandidates[0] ?? null) : null,
      candidates: exactTitleCandidates,
    };
  }

  if (likelyTitleCandidates.length === 1) {
    return {
      status: 'LIKELY_BOOK_MATCH',
      selectedBook: likelyTitleCandidates[0] ?? null,
      candidates: likelyTitleCandidates,
    };
  }

  if (likelyTitleCandidates.length > 1) {
    return {
      status: 'AMBIGUOUS_BOOK_MATCH',
      selectedBook: null,
      candidates: likelyTitleCandidates,
    };
  }

  return {
    status: 'BOOK_NOT_FOUND',
    selectedBook: null,
    candidates: [],
  };
}

function getItemStatus(
  authorStatus: AuthorTestimonialSeedPlanItem['authorMatch']['status'],
  bookStatus: AuthorTestimonialSeedPlanItem['bookMatch']['status'],
  alreadyExists: boolean,
): AuthorTestimonialSeedPlanItem['status'] {
  if (alreadyExists) {
    return 'SKIP_ALREADY_EXISTS';
  }

  if (authorStatus === 'AUTHOR_NOT_FOUND' || authorStatus === 'AMBIGUOUS_AUTHOR_MATCH') {
    return 'BLOCKED';
  }

  if (authorStatus !== 'EXACT_AUTHOR_MATCH') {
    return 'MANUAL_REVIEW';
  }

  if (bookStatus === 'AMBIGUOUS_BOOK_MATCH') {
    return 'BLOCKED';
  }

  if (bookStatus === 'LIKELY_BOOK_MATCH' || bookStatus === 'BOOK_NOT_FOUND') {
    return 'MANUAL_REVIEW';
  }

  return 'READY_TO_INSERT';
}

function getDecisionItemStatus(
  decision: AuthorTestimonialSeedDecision | null,
  selectedAuthor: SeedAuthorRow | null,
  selectedBook: SeedBookRow | null,
  alreadyExists: boolean,
): AuthorTestimonialSeedPlanItem['status'] {
  if (!decision || decision.decision === null) {
    return 'BLOCKED';
  }

  if (decision.decision === 'skip') {
    return 'MANUAL_REVIEW';
  }

  if (decision.decision === 'manual_review') {
    return 'BLOCKED';
  }

  if (!selectedAuthor) {
    return 'BLOCKED';
  }

  if (decision.selectedBookId && !selectedBook) {
    return 'BLOCKED';
  }

  if (alreadyExists) {
    return 'SKIP_ALREADY_EXISTS';
  }

  return 'READY_TO_INSERT';
}

function getDecisionIssue(
  decision: AuthorTestimonialSeedDecision | null,
  selectedAuthor: SeedAuthorRow | null,
  selectedBook: SeedBookRow | null,
): AuthorTestimonialsSeedConflict['code'] | null {
  if (!decision || decision.decision === null) {
    return 'DECISION_REQUIRED';
  }

  if (decision.decision === 'skip') {
    return null;
  }

  if (decision.decision === 'manual_review') {
    return 'MANUAL_REVIEW_DECISION';
  }

  if (!selectedAuthor) {
    return 'INVALID_DECISION_AUTHOR';
  }

  if (decision.selectedBookId && !selectedBook) {
    return 'INVALID_DECISION_BOOK';
  }

  return null;
}

function buildConflicts(
  items: AuthorTestimonialSeedPlanItem[],
  tableExists: boolean,
  decisionsEnabled: boolean,
): AuthorTestimonialsSeedConflict[] {
  const conflicts: AuthorTestimonialsSeedConflict[] = [];

  if (!tableExists) {
    conflicts.push({
      severity: 'error',
      code: 'TABLE_MISSING',
      sourceName: 'author_testimonials',
      message: 'La tabla author_testimonials no existe todavía.',
      details: 'Aplica primero la migración 0006_yielding_jubilee.sql con npm run db:migrate.',
    });
  }

  for (const item of items) {
    const decisionReasons = item.reasons.filter(
      (reason): reason is AuthorTestimonialsSeedConflict['code'] =>
        reason === 'DECISION_REQUIRED' ||
        reason === 'MANUAL_REVIEW_DECISION' ||
        reason === 'INVALID_DECISION_AUTHOR' ||
        reason === 'INVALID_DECISION_BOOK',
    );

    for (const reason of decisionReasons) {
      conflicts.push({
        severity: reason === 'DECISION_REQUIRED' ? 'warning' : 'error',
        code: reason,
        sourceName: item.sourceName,
        message: 'La decisión editorial impide insertar este testimonio.',
        details: getDecisionConflictDetails(reason),
      });
    }

    if (decisionsEnabled) {
      continue;
    }

    if (item.authorMatch.status !== 'EXACT_AUTHOR_MATCH') {
      conflicts.push({
        severity: item.authorMatch.status === 'LIKELY_AUTHOR_MATCH' ? 'warning' : 'error',
        code: item.authorMatch.status,
        sourceName: item.sourceName,
        message: 'El autor requiere revisión antes de insertar.',
        details: item.authorMatch.candidates.map((candidate) => candidate.name).join(', '),
      });
    }

    if (
      item.bookMatch.status !== 'EXACT_BOOK_MATCH' &&
      item.bookMatch.status !== 'NO_BOOK_SUGGESTED'
    ) {
      conflicts.push({
        severity:
          item.bookMatch.status === 'LIKELY_BOOK_MATCH' ||
          item.bookMatch.status === 'BOOK_NOT_FOUND'
            ? 'warning'
            : 'error',
        code: item.bookMatch.status,
        sourceName: item.sourceName,
        message: 'El libro sugerido requiere revisión antes de asociarse.',
        details: item.bookMatch.candidates.map((candidate) => candidate.title).join(', '),
      });
    }
  }

  return conflicts;
}

function getDecisionConflictDetails(code: AuthorTestimonialsSeedConflict['code']): string {
  if (code === 'DECISION_REQUIRED') {
    return 'Pendiente de aprobación editorial explícita.';
  }

  if (code === 'MANUAL_REVIEW_DECISION') {
    return 'Marcado para revisión manual; no se insertará automáticamente.';
  }

  if (code === 'INVALID_DECISION_AUTHOR') {
    return 'selectedAuthorId no corresponde a un autor existente.';
  }

  if (code === 'INVALID_DECISION_BOOK') {
    return 'selectedBookId no corresponde a un libro existente.';
  }

  return '';
}

function countBy<T>(items: T[], predicate: (item: T) => boolean): number {
  return items.filter(predicate).length;
}
