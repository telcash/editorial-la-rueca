import { createHash } from 'node:crypto';

import {
  createAuthorSchema,
  normalizeAuthorSlug,
  type CreateAuthorInput,
} from '@/schemas/authors/author.schema';
import {
  createBookSchema,
  normalizeBookSlug,
  type BookEditionInput,
  type CreateBookInput,
} from '@/schemas/books/book.schema';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotRelationshipCandidate,
} from '@/features/migration/wordpress-pilot/types';
import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassConflict,
  MassEditionPlan,
  MassPlan,
  MassRelationPlan,
  RedirectCandidate,
} from './types';

interface BookCoverBestMatch {
  bookCandidateKey: string;
  bookTitle: string;
  bestCandidate: {
    attachmentId: string;
    attachmentUrl: string;
    filename: string;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    reasons: string;
  } | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  alternatives: Array<{
    attachmentId: string;
    attachmentUrl: string;
    filename: string;
    score: number;
    confidence: 'high' | 'medium' | 'low';
    reasons: string;
  }>;
  reasons: string[];
}

export interface MassPlannerInput {
  data: PilotAuditData;
  bookCoverBestMatches: BookCoverBestMatch[];
  generatedAt?: string;
}

const placeholderEdition: BookEditionInput = {
  format: 'paperback',
  editionLabel: 'Datos pendientes de revisión',
  publicationDate: null,
  isbn10: null,
  isbn13: null,
  price: null,
  currency: 'EUR',
  pages: null,
  isAvailable: false,
  isFeatured: false,
  sortOrder: 0,
};

export function planMassMigration(input: MassPlannerInput): MassPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const authors = getUniqueAuthors(input.data.authors);
  const books = getUniqueBooks(input.data.books);
  const authorDuplicateGroups = getDuplicateGroups(
    authors,
    (author) => author.possibleDuplicateGroup,
  );
  const bookDuplicateGroups = getDuplicateGroups(books, (book) => book.duplicateGroupId);
  const authorSlugConflicts = getSlugConflicts(
    authors.map((author) => [author.candidateKey, author.slug]),
  );
  const bookSlugConflicts = getSlugConflicts(books.map((book) => [book.candidateKey, book.title]));
  const attachmentsById = new Map(
    input.data.attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const conflicts: MassConflict[] = [];
  const authorPlans = authors.map((author, index) =>
    createAuthorPlan(author, index, authorDuplicateGroups, authorSlugConflicts, conflicts),
  );
  const authorPlansByKey = new Map(authorPlans.map((author) => [author.candidateKey, author]));
  const bookPlans = books.map((book, index) =>
    createBookPlan(
      book,
      index,
      bookDuplicateGroups,
      bookSlugConflicts,
      input.data.decisions.bookDuplicateGroups ?? {},
      conflicts,
    ),
  );
  const bookPlansByKey = new Map(bookPlans.map((book) => [book.candidateKey, book]));
  const relationPlans = input.data.relationships.map((relation) =>
    createRelationPlan(relation, authorPlansByKey, bookPlansByKey, conflicts),
  );
  const editionPlans = bookPlans.map(createEditionPlan);
  const authorImagePlans = authors.map((author) => createAuthorImagePlan(author, attachmentsById));
  const coverBestMatchByBook = new Map(
    input.bookCoverBestMatches.map((match) => [match.bookCandidateKey, match]),
  );
  const bookCoverPlans = books.map((book) => createBookCoverPlan(book, coverBestMatchByBook));
  const redirectCandidates = createRedirectCandidates(authorPlans, bookPlans);
  const manualReview = createManualReview({
    authorPlans,
    bookPlans,
    authorImagePlans,
    bookCoverPlans,
  });
  const decisionsTemplate = createDecisionsTemplate(input.data.decisions.bookDuplicateGroups ?? {});
  const summary = createSummary({
    generatedAt,
    data: input.data,
    authors,
    books,
    authorPlans,
    bookPlans,
    relationPlans,
    editionPlans,
    authorImagePlans,
    bookCoverPlans,
    conflicts,
    manualReview,
    redirectCandidates,
  });

  return {
    generatedAt,
    mode: 'dry-run',
    authors: authorPlans,
    books: bookPlans,
    relations: relationPlans,
    editions: editionPlans,
    authorImages: authorImagePlans,
    bookCovers: bookCoverPlans,
    conflicts,
    manualReview,
    redirects: redirectCandidates,
    summary,
    decisionsTemplate,
  };
}

function createAuthorPlan(
  author: PilotAuthorCandidate,
  sortOrder: number,
  duplicateGroups: Map<string, string[]>,
  slugConflicts: Map<string, string[]>,
  conflicts: MassConflict[],
): MassAuthorPlan {
  const duplicateKeys = author.possibleDuplicateGroup
    ? (duplicateGroups.get(author.possibleDuplicateGroup) ?? [])
    : [];
  const hasDuplicateBlock = duplicateKeys.length > 1;
  const slug = normalizeAuthorSlug(author.slug || author.name);
  const input: CreateAuthorInput = {
    name: author.name,
    slug,
    shortBio: null,
    biography:
      author.classification === 'author_only_candidate' && author.reviewLikelyType === 'author_bio'
        ? author.rawReview || null
        : null,
    photoUrl: null,
    websiteUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    country: null,
    isFeatured: false,
    isPublished: false,
    sortOrder,
  };
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const validation = createAuthorSchema.safeParse(input);

  if (hasDuplicateBlock) {
    blockingReasons.push(`Grupo duplicado sin decision: ${author.possibleDuplicateGroup}`);
    addConflict(
      conflicts,
      'DUPLICATE_AUTHOR_UNRESOLVED',
      'author',
      author.candidateKey,
      author.sourceWpPostId,
      'Autor en grupo de duplicados sin decision.',
      author.possibleDuplicateGroup,
    );
  }

  const slugConflictKeys = slugConflicts.get(slug) ?? [];

  if (slugConflictKeys.length > 1) {
    blockingReasons.push(`Slug interno duplicado: ${slug}`);
    addConflict(
      conflicts,
      'INTERNAL_SLUG_CONFLICT',
      'author',
      author.candidateKey,
      author.sourceWpPostId,
      'Slug de autor colisiona internamente.',
      slug,
    );
  }

  if (/-\d+$/u.test(slug)) {
    warnings.push('Slug con sufijo historico numerico; revisar antes de apply.');
  }

  if (!validation.success) {
    blockingReasons.push('Input de autor invalido para el schema actual.');
    addConflict(
      conflicts,
      'INVALID_DOMAIN_INPUT',
      'author',
      author.candidateKey,
      author.sourceWpPostId,
      'El autor no valida contra createAuthorSchema.',
      validation.error.issues.map((issue) => issue.message).join(' | '),
    );
  }

  return {
    candidateKey: author.candidateKey,
    sourceWpPostId: author.sourceWpPostId,
    action: hasDuplicateBlock
      ? 'REQUIRES_DUPLICATE_DECISION'
      : blockingReasons.length > 0
        ? 'MANUAL_REVIEW'
        : 'AUTO_CREATE',
    status: blockingReasons.length > 0 ? 'BLOCKED' : 'READY',
    input,
    blockingReasons,
    warnings,
    resolvedDependencies: {},
    sourceMetadata: createAuthorMetadata(author),
  };
}

function createBookPlan(
  book: PilotBookCandidate,
  sortOrder: number,
  duplicateGroups: Map<string, string[]>,
  slugConflicts: Map<string, string[]>,
  bookDuplicateDecisions: NonNullable<PilotAuditData['decisions']['bookDuplicateGroups']>,
  conflicts: MassConflict[],
): MassBookPlan {
  const duplicateKeys = book.duplicateGroupId
    ? (duplicateGroups.get(book.duplicateGroupId) ?? [])
    : [];
  const duplicateDecision = book.duplicateGroupId
    ? bookDuplicateDecisions[book.duplicateGroupId]
    : undefined;
  const hasDuplicateBlock = duplicateKeys.length > 1 && !duplicateDecision;
  const slug = normalizeBookSlug(book.title);
  const authorId = deterministicUuid(`author:${book.sourceAuthorSlug || book.sourceAuthorTitle}`);
  const input: CreateBookInput = {
    title: book.title,
    subtitle: null,
    slug,
    description: book.rawReview || null,
    excerpt: book.plainTextPreview || null,
    coverUrl: null,
    originalPublicationDate: null,
    language: null,
    isFeatured: false,
    isPublished: false,
    sortOrder,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    authorIds: [authorId],
    categoryIds: [],
    editions: [placeholderEdition],
  };
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const validation = createBookSchema.safeParse(input);

  if (hasDuplicateBlock) {
    blockingReasons.push(`Grupo duplicado de libro sin decision: ${book.duplicateGroupId}`);
    addConflict(
      conflicts,
      'DUPLICATE_BOOK_UNRESOLVED',
      'book',
      book.candidateKey,
      book.sourceWpPostId,
      'Libro en grupo duplicado sin decision.',
      book.duplicateGroupId,
    );
  }

  const slugConflictKeys = slugConflicts.get(slug) ?? [];

  if (slugConflictKeys.length > 1 && !duplicateDecision) {
    blockingReasons.push(`Slug interno duplicado: ${slug}`);
    addConflict(
      conflicts,
      'INTERNAL_SLUG_CONFLICT',
      'book',
      book.candidateKey,
      book.sourceWpPostId,
      'Slug de libro colisiona internamente.',
      slug,
    );
  }

  if (!validation.success) {
    blockingReasons.push('Input de libro invalido para el schema actual.');
    addConflict(
      conflicts,
      'INVALID_DOMAIN_INPUT',
      'book',
      book.candidateKey,
      book.sourceWpPostId,
      'El libro no valida contra createBookSchema.',
      validation.error.issues.map((issue) => issue.message).join(' | '),
    );
  }

  if (book.videoId) {
    warnings.push('tf_video no esta modelado; se conserva en sourceMetadata.');
  }

  return {
    candidateKey: book.candidateKey,
    sourceWpPostId: book.sourceWpPostId,
    action: hasDuplicateBlock
      ? 'REQUIRES_DUPLICATE_DECISION'
      : blockingReasons.length > 0
        ? 'MANUAL_REVIEW'
        : 'AUTO_CREATE',
    status: blockingReasons.length > 0 ? 'BLOCKED' : 'READY',
    input,
    blockingReasons,
    warnings,
    resolvedDependencies: {
      authorCandidateKeys: [book.sourceAuthorSlug],
      categoryIds: [],
    },
    sourceMetadata: createBookMetadata(book),
  };
}

function createRelationPlan(
  relation: PilotRelationshipCandidate,
  authorPlansByKey: Map<string, MassAuthorPlan>,
  bookPlansByKey: Map<string, MassBookPlan>,
  conflicts: MassConflict[],
): MassRelationPlan {
  const author = authorPlansByKey.get(relation.authorCandidateKey);
  const book = bookPlansByKey.get(relation.bookCandidateKey);
  const blockingReasons: string[] = [];

  if (!author || author.status !== 'READY') {
    blockingReasons.push('Autor relacionado no tiene mapping READY.');
    addConflict(
      conflicts,
      'MISSING_AUTHOR_MAPPING',
      'relation',
      relation.bookCandidateKey,
      relation.sourceWpPostId,
      'La relacion no puede aplicarse sin autor READY.',
      relation.authorCandidateKey,
    );
  }

  if (!book || book.status !== 'READY') {
    blockingReasons.push('Libro relacionado no tiene mapping READY.');
  }

  if (blockingReasons.length > 0) {
    return {
      ...relation,
      action: 'BLOCKED',
      status: 'BLOCKED',
      blockingReasons,
      warnings: [],
      resolvedDependencies: {
        authorCandidateKey: relation.authorCandidateKey,
        bookCandidateKey: relation.bookCandidateKey,
      },
    };
  }

  if (relation.confidence !== 'high') {
    return {
      ...relation,
      action: 'MANUAL_REVIEW',
      status: 'MANUAL_REVIEW',
      blockingReasons: [],
      warnings: ['Relacion sin confidence high.'],
      resolvedDependencies: {
        authorCandidateKey: relation.authorCandidateKey,
        bookCandidateKey: relation.bookCandidateKey,
      },
    };
  }

  return {
    ...relation,
    action: 'AUTO_CREATE',
    status: 'READY',
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {
      authorCandidateKey: relation.authorCandidateKey,
      bookCandidateKey: relation.bookCandidateKey,
    },
  };
}

function createEditionPlan(book: MassBookPlan): MassEditionPlan {
  return {
    bookCandidateKey: book.candidateKey,
    sourceWpPostId: book.sourceWpPostId,
    action: book.status === 'READY' ? 'AUTO_CREATE' : 'BLOCKED',
    status: book.status === 'READY' ? 'READY' : 'BLOCKED',
    format: 'paperback',
    editionLabel: 'Datos pendientes de revisión',
    isbn10: null,
    isbn13: null,
    price: null,
    pages: null,
    publicationDate: null,
    inferredEdition: true,
    blockingReasons: book.status === 'READY' ? [] : ['El libro no esta READY.'],
  };
}

function createAuthorImagePlan(
  author: PilotAuthorCandidate,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
): MassAuthorImagePlan {
  if (!author.thumbnailId) {
    return {
      authorCandidateKey: author.candidateKey,
      sourceWpPostId: author.sourceWpPostId,
      attachmentId: null,
      filename: null,
      url: null,
      status: 'NO_IMAGE',
      confidence: 'none',
      score: 0,
      reasons: ['No hay _thumbnail_id resuelto.'],
    };
  }

  const attachment = attachmentsById.get(author.thumbnailId);

  if (!attachment) {
    return {
      authorCandidateKey: author.candidateKey,
      sourceWpPostId: author.sourceWpPostId,
      attachmentId: author.thumbnailId,
      filename: null,
      url: null,
      status: 'MANUAL_REVIEW',
      confidence: 'low',
      score: 0,
      reasons: ['_thumbnail_id no resuelve a attachment.'],
    };
  }

  const size = readFileSizeBytes(attachment);

  if (size !== null && size > 5 * 1024 * 1024) {
    return createAuthorImageResult(author, attachment, 'TOO_LARGE', 'low', 0, [
      'Attachment supera 5 MB segun metadata.',
    ]);
  }

  const signal = getImageTextSignal(attachment);
  const score = signal === 'author_photo' ? 90 : signal === 'unknown' ? 20 : -40;

  if (author.imageFieldId && author.imageFieldId !== author.thumbnailId) {
    return createAuthorImageResult(author, attachment, 'MANUAL_REVIEW', 'low', score, [
      '_thumbnail_id e imagen_destacada_2 difieren; rol ambiguo.',
    ]);
  }

  if (signal === 'author_photo') {
    return createAuthorImageResult(author, attachment, 'AUTO_UPLOAD', 'high', score, [
      '_thumbnail_id tiene señales de foto de autor.',
    ]);
  }

  return createAuthorImageResult(author, attachment, 'MANUAL_REVIEW', 'low', score, [
    '_thumbnail_id no tiene evidencias fuertes de foto de autor.',
  ]);
}

function createAuthorImageResult(
  author: PilotAuthorCandidate,
  attachment: PilotAttachmentCandidate,
  status: MassAuthorImagePlan['status'],
  confidence: MassAuthorImagePlan['confidence'],
  score: number,
  reasons: string[],
): MassAuthorImagePlan {
  return {
    authorCandidateKey: author.candidateKey,
    sourceWpPostId: author.sourceWpPostId,
    attachmentId: attachment.wpPostId,
    filename: attachment.attachedFile,
    url: attachment.url,
    status,
    confidence,
    score,
    reasons,
  };
}

function createBookCoverPlan(
  book: PilotBookCandidate,
  coverBestMatchByBook: Map<string, BookCoverBestMatch>,
): MassBookCoverPlan {
  const match = coverBestMatchByBook.get(book.candidateKey);
  const candidate = match?.bestCandidate ?? null;

  if (!candidate) {
    return {
      bookCandidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      attachmentId: null,
      filename: null,
      url: null,
      score: null,
      confidence: 'none',
      status: 'NO_COVER',
      reasons: ['No hay bestCandidate suficiente; no se fuerza portada.'],
    };
  }

  if (candidate.confidence === 'high') {
    return {
      bookCandidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      attachmentId: candidate.attachmentId,
      filename: candidate.filename,
      url: candidate.attachmentUrl,
      score: candidate.score,
      confidence: 'high',
      status: 'AUTO_UPLOAD_CANDIDATE',
      reasons: splitReasons(candidate.reasons),
    };
  }

  if (candidate.confidence === 'medium') {
    return {
      bookCandidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      attachmentId: candidate.attachmentId,
      filename: candidate.filename,
      url: candidate.attachmentUrl,
      score: candidate.score,
      confidence: 'medium',
      status: 'MANUAL_REVIEW',
      reasons: splitReasons(candidate.reasons),
    };
  }

  return {
    bookCandidateKey: book.candidateKey,
    sourceWpPostId: book.sourceWpPostId,
    attachmentId: candidate.attachmentId,
    filename: candidate.filename,
    url: candidate.attachmentUrl,
    score: candidate.score,
    confidence: 'low',
    status: 'NO_AUTO_UPLOAD',
    reasons: splitReasons(candidate.reasons),
  };
}

function createRedirectCandidates(
  authors: MassAuthorPlan[],
  books: MassBookPlan[],
): RedirectCandidate[] {
  const authorRedirects = authors
    .filter((author) => typeof author.sourceMetadata.oldUrl === 'string')
    .map((author): RedirectCandidate => ({
      oldUrl: author.sourceMetadata.oldUrl as string,
      targetType: 'author',
      targetCandidateKey: author.candidateKey,
      proposedNewPath: `/autores/${author.input.slug}`,
      confidence: 'high',
      warnings: [],
    }));
  const bookRedirects = books.map((book): RedirectCandidate => ({
    oldUrl: typeof book.sourceMetadata.oldUrl === 'string' ? book.sourceMetadata.oldUrl : '',
    targetType: 'book',
    targetCandidateKey: book.candidateKey,
    proposedNewPath: null,
    confidence: 'low',
    warnings: ['NO_DEDICATED_OLD_URL'],
  }));

  return [...authorRedirects, ...bookRedirects].filter((redirect) => redirect.oldUrl.length > 0);
}

function createManualReview(params: {
  authorPlans: MassAuthorPlan[];
  bookPlans: MassBookPlan[];
  authorImagePlans: MassAuthorImagePlan[];
  bookCoverPlans: MassBookCoverPlan[];
}) {
  return {
    authorDuplicates: params.authorPlans.filter((author) =>
      author.blockingReasons.some((reason) => reason.includes('duplicado')),
    ),
    bookDuplicates: params.bookPlans.filter((book) =>
      book.blockingReasons.some((reason) => reason.includes('duplicado')),
    ),
    authorImages: params.authorImagePlans.filter((image) => image.status === 'MANUAL_REVIEW'),
    bookCovers: params.bookCoverPlans.filter((cover) =>
      ['MANUAL_REVIEW', 'NO_AUTO_UPLOAD'].includes(cover.status),
    ),
    tooLargeImages: params.authorImagePlans.filter((image) => image.status === 'TOO_LARGE'),
    unmodeledFields: ['tf_video', 'tf_alto', 'tf_ancho', 'tf_peso', 'tf_link_compra_1'],
  };
}

function createDecisionsTemplate(
  knownBookDuplicateDecisions: NonNullable<PilotAuditData['decisions']['bookDuplicateGroups']>,
) {
  return {
    authorDuplicateGroups: {},
    bookDuplicateGroups: {
      ...knownBookDuplicateDecisions,
    },
    authorImageOverrides: {},
    bookCoverOverrides: {},
    slugOverrides: {},
  };
}

function createSummary(params: {
  generatedAt: string;
  data: PilotAuditData;
  authors: PilotAuthorCandidate[];
  books: PilotBookCandidate[];
  authorPlans: MassAuthorPlan[];
  bookPlans: MassBookPlan[];
  relationPlans: MassRelationPlan[];
  editionPlans: MassEditionPlan[];
  authorImagePlans: MassAuthorImagePlan[];
  bookCoverPlans: MassBookCoverPlan[];
  conflicts: MassConflict[];
  manualReview: Record<string, unknown>;
  redirectCandidates: RedirectCandidate[];
}) {
  const manualReviewGroups = params.manualReview as {
    authorDuplicates: unknown[];
    bookDuplicates: unknown[];
    authorImages: unknown[];
    bookCovers: unknown[];
    tooLargeImages: unknown[];
    unmodeledFields: unknown[];
  };

  return {
    generatedAt: params.generatedAt,
    sources: {
      totalAuthorsCpt: params.authors.length,
      totalLegacyBookRows: params.data.books.length,
      totalUniqueLegacyBooks: params.books.length,
      totalRelationships: params.data.relationships.length,
      totalAttachments: params.data.attachments.length,
    },
    authors: {
      totalCandidates: params.authorPlans.length,
      ready: countStatus(params.authorPlans, 'READY'),
      duplicateDecision: params.authorPlans.filter(
        (author) => author.action === 'REQUIRES_DUPLICATE_DECISION',
      ).length,
      manualReview: countStatus(params.authorPlans, 'MANUAL_REVIEW'),
      skipped: countStatus(params.authorPlans, 'SKIPPED'),
      withSafePhoto: params.authorImagePlans.filter((image) => image.status === 'AUTO_UPLOAD')
        .length,
      tooLarge: params.authorImagePlans.filter((image) => image.status === 'TOO_LARGE').length,
      noImage: params.authorImagePlans.filter((image) => image.status === 'NO_IMAGE').length,
    },
    books: {
      totalCandidates: params.bookPlans.length,
      ready: countStatus(params.bookPlans, 'READY'),
      blockedDuplicate: params.bookPlans.filter(
        (book) => book.action === 'REQUIRES_DUPLICATE_DECISION',
      ).length,
      manualReview: countStatus(params.bookPlans, 'MANUAL_REVIEW'),
      skipped: countStatus(params.bookPlans, 'SKIPPED'),
      inferredEditions: params.editionPlans.filter((edition) => edition.inferredEdition).length,
      highConfidenceCover: params.bookCoverPlans.filter(
        (cover) => cover.status === 'AUTO_UPLOAD_CANDIDATE',
      ).length,
      mediumCover: params.bookCoverPlans.filter((cover) => cover.status === 'MANUAL_REVIEW').length,
      lowCover: params.bookCoverPlans.filter((cover) => cover.status === 'NO_AUTO_UPLOAD').length,
      noCover: params.bookCoverPlans.filter((cover) => cover.status === 'NO_COVER').length,
    },
    relations: {
      auto: params.relationPlans.filter((relation) => relation.action === 'AUTO_CREATE').length,
      manual: params.relationPlans.filter((relation) => relation.action === 'MANUAL_REVIEW').length,
      blocked: params.relationPlans.filter((relation) => relation.action === 'BLOCKED').length,
    },
    images: {
      authorPhotosSafe: params.authorImagePlans.filter((image) => image.status === 'AUTO_UPLOAD')
        .length,
      bookCoversHigh: params.bookCoverPlans.filter(
        (cover) => cover.status === 'AUTO_UPLOAD_CANDIDATE',
      ).length,
      manualReview:
        params.authorImagePlans.filter((image) => image.status === 'MANUAL_REVIEW').length +
        params.bookCoverPlans.filter((cover) => cover.status === 'MANUAL_REVIEW').length,
      tooLarge: params.authorImagePlans.filter((image) => image.status === 'TOO_LARGE').length,
    },
    blockers: params.conflicts.length,
    manualReview: {
      total:
        manualReviewGroups.authorDuplicates.length +
        manualReviewGroups.bookDuplicates.length +
        manualReviewGroups.authorImages.length +
        manualReviewGroups.bookCovers.length +
        manualReviewGroups.tooLargeImages.length,
      authorDuplicates: manualReviewGroups.authorDuplicates.length,
      bookDuplicates: manualReviewGroups.bookDuplicates.length,
      authorImages: manualReviewGroups.authorImages.length,
      bookCovers: manualReviewGroups.bookCovers.length,
      unmodeledFields: manualReviewGroups.unmodeledFields.length,
    },
    redirects: params.redirectCandidates.length,
  };
}

function createAuthorMetadata(
  author: PilotAuthorCandidate,
): Record<string, string | boolean | null> {
  return {
    oldUrl: author.oldUrl || null,
    sourceSlug: author.slug || null,
    rawReview: author.rawReview || null,
    yoastMetaTitle: author.yoastMetaTitle || null,
    yoastMetaDescription: author.yoastMetaDescription || null,
    canonicalUrl: author.canonicalUrl || null,
    classification: author.classification || null,
    possibleDuplicateGroup: author.possibleDuplicateGroup || null,
  };
}

function createBookMetadata(book: PilotBookCandidate): Record<string, string | boolean | null> {
  return {
    oldUrl: book.sourceOldUrl || null,
    sourceSlug: book.sourceAuthorSlug || null,
    rawReview: book.rawReview || null,
    plainTextPreview: book.plainTextPreview || null,
    tf_video: book.videoId || null,
    tf_alto: null,
    tf_ancho: null,
    tf_peso: null,
    tf_link_compra_1: null,
    duplicateGroupId: book.duplicateGroupId || null,
    noDedicatedOldUrl: true,
  };
}

function getUniqueAuthors(authors: PilotAuthorCandidate[]) {
  return [...new Map(authors.map((author) => [author.candidateKey, author])).values()];
}

function getUniqueBooks(books: PilotBookCandidate[]) {
  return [...new Map(books.map((book) => [book.candidateKey, book])).values()];
}

function getDuplicateGroups<TItem>(
  items: TItem[],
  getGroup: (item: TItem) => string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const item of items) {
    const group = getGroup(item);

    if (!group) {
      continue;
    }

    const key =
      'candidateKey' in (item as object)
        ? String((item as { candidateKey: string }).candidateKey)
        : '';
    groups.set(group, [...(groups.get(group) ?? []), key]);
  }

  return groups;
}

function getSlugConflicts(entries: Array<[string, string]>) {
  const grouped = new Map<string, string[]>();

  for (const [candidateKey, value] of entries) {
    const slug = normalizeBookSlug(value);
    grouped.set(slug, [...(grouped.get(slug) ?? []), candidateKey]);
  }

  return new Map([...grouped.entries()].filter(([, keys]) => keys.length > 1));
}

function addConflict(
  conflicts: MassConflict[],
  code: MassConflict['code'],
  entityType: MassConflict['entityType'],
  candidateKey: string,
  sourceWpPostId: string,
  message: string,
  details: string | undefined,
) {
  conflicts.push({
    code,
    entityType,
    candidateKey,
    sourceWpPostId,
    message,
    details: details ?? '',
  });
}

function countStatus<TItem extends { status: string }>(items: TItem[], status: string) {
  return items.filter((item) => item.status === status).length;
}

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(
    17,
    20,
  )}-${hash.slice(20, 32)}`;
}

function getImageTextSignal(attachment: PilotAttachmentCandidate) {
  const text = [attachment.attachedFile, attachment.title, attachment.slug]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    text.includes('foto') ||
    text.includes('autor') ||
    text.includes('retrato') ||
    text.includes('portrait')
  ) {
    return 'author_photo';
  }

  if (text.includes('portada') || text.includes('cover') || text.includes('cubierta')) {
    return 'book_cover';
  }

  return 'unknown';
}

function readFileSizeBytes(attachment: PilotAttachmentCandidate) {
  const candidate = attachment as PilotAttachmentCandidate & {
    fileSizeBytes?: string | number;
    sizeBytes?: string | number;
  };
  const value = candidate.fileSizeBytes ?? candidate.sizeBytes;

  if (value === undefined) {
    return null;
  }

  const size = Number(value);

  return Number.isFinite(size) ? size : null;
}

function splitReasons(value: string) {
  return value.split(' | ').filter(Boolean);
}
