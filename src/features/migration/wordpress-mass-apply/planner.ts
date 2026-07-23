import { createHash } from 'node:crypto';

import { normalizeAuthorSlug } from '@/schemas/authors/author.schema';
import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassRelationPlan,
} from '@/features/migration/wordpress-mass/types';
import type { PilotManifest } from '@/features/migration/wordpress-pilot/types';
import type {
  AuthorDeduplicationMapGroup,
  MassApplyBatch,
  MassApplyBookPlan,
  MassApplyConflict,
  MassApplyImagePlan,
  MassApplyManifest,
  MassApplyManifestEntry,
  MassApplyPlan,
  MassApplyRelationPlan,
  MassApplyRollbackPlan,
  MassApplyStatus,
} from './types';

interface MassApplyPlannerInput {
  generatedAt?: string;
  mode?: 'dry-run' | 'preflight' | 'apply';
  batchSize?: number;
  limit?: number;
  authors: MassAuthorPlan[];
  books: MassBookPlan[];
  relations: MassRelationPlan[];
  authorImages: MassAuthorImagePlan[];
  bookCovers: MassBookCoverPlan[];
  pilotManifest?: PilotManifest | null;
}

const placeholderEdition = {
  format: 'paperback' as const,
  editionLabel: 'Datos pendientes de revisión',
  publicationDate: null,
  isbn10: null,
  isbn13: null,
  price: null,
  currency: 'EUR' as const,
  pages: null,
  isAvailable: false,
  isFeatured: false,
  sortOrder: 0,
};

export function planMassApply(input: MassApplyPlannerInput): MassApplyPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const batchSize = normalizeBatchSize(input.batchSize);
  const mode = input.mode ?? 'dry-run';
  const pilotMappings = getPilotMappings(input.pilotManifest);
  const conflicts: MassApplyConflict[] = [
    {
      code: 'BACKUP_REQUIRED_BEFORE_APPLY',
      severity: 'error',
      entityType: 'runtime',
      candidateKey: 'mass-migration',
      message: 'Debe existir backup verificado antes de ejecutar apply.',
      details: 'Apply requiere --confirm MASS_MIGRATION y --confirm-backup.',
    },
  ];
  const authors = createAuthorPlans(input.authors, pilotMappings.authorIdsByCandidateKey);
  const limitedAuthorKeys = new Set(
    limitKeys(
      authors.map((author) => author.candidateKey),
      input.limit,
    ),
  );
  const effectiveAuthors = input.limit
    ? authors.filter(
        (author) => limitedAuthorKeys.has(author.candidateKey) || author.action === 'REUSE_PILOT',
      )
    : authors;
  const authorPlansByKey = new Map(effectiveAuthors.map((author) => [author.candidateKey, author]));
  const books = createBookPlans(
    input.books,
    input.relations,
    pilotMappings.bookIdsByCandidateKey,
  ).filter(
    (book) =>
      !input.limit ||
      book.action === 'REUSE_PILOT' ||
      book.status === 'SKIPPED' ||
      book.input.sortOrder < input.limit,
  );
  const bookPlansByKey = new Map(books.map((book) => [book.candidateKey, book]));
  const relations = createRelationPlans(input.relations, authorPlansByKey, bookPlansByKey);
  const editions = books.map((book) => ({
    bookCandidateKey: book.candidateKey,
    sourceWpPostId: book.sourceWpPostId,
    status: book.status === 'SKIPPED' || book.status === 'BLOCKED' ? book.status : book.status,
    action:
      book.action === 'REUSE_PILOT'
        ? ('REUSE_PILOT' as const)
        : book.status === 'READY'
          ? ('CREATE' as const)
          : book.status === 'SKIPPED'
            ? ('SKIP' as const)
            : ('BLOCK' as const),
    edition: placeholderEdition,
    inferredEdition: true as const,
    warnings: ['Edicion inferida; no se inventan ISBN, precio, paginas ni fecha.'],
    blockingReasons: book.status === 'BLOCKED' ? book.blockingReasons : [],
  }));
  const authorImages = createAuthorImagePlans(input.authorImages, authorPlansByKey);
  const bookCovers = createBookCoverPlans(input.bookCovers, bookPlansByKey);
  const duplicateRelations = dedupeRelationPlans(relations);
  const batches = createBatches(
    [
      ...effectiveAuthors.filter((author) => author.action === 'CREATE'),
      ...books.filter((book) => book.action === 'CREATE'),
      ...duplicateRelations.filter((relation) => relation.action === 'CREATE'),
      ...editions.filter((edition) => edition.action === 'CREATE'),
      ...authorImages.filter((image) => image.action === 'UPLOAD'),
      ...bookCovers.filter((image) => image.action === 'UPLOAD'),
    ],
    batchSize,
  );
  const manifest = createManifest({
    generatedAt,
    mode,
    authors: effectiveAuthors,
    books,
    relations: duplicateRelations,
    editions,
    authorImages,
    bookCovers,
  });
  const rollbackPlan = createRollbackPlan(generatedAt, manifest);
  const authorDeduplicationMap = createAuthorDeduplicationMap(
    input.authors,
    effectiveAuthors,
    input.relations,
  );
  const result = createInitialResult(
    generatedAt,
    effectiveAuthors,
    books,
    duplicateRelations,
    editions,
    authorImages,
    bookCovers,
  );
  const summary = {
    authorsTotal: effectiveAuthors.length,
    authorsToCreate: effectiveAuthors.filter((author) => author.action === 'CREATE').length,
    authorsReusedFromPilot: effectiveAuthors.filter((author) => author.action === 'REUSE_PILOT')
      .length,
    duplicateAuthorRecordsPreserved: effectiveAuthors.filter(
      (author) => author.needsAuthorDeduplication,
    ).length,
    validBooksTotal: books.filter((book) => book.status !== 'SKIPPED').length,
    booksToCreate: books.filter((book) => book.action === 'CREATE').length,
    booksReusedFromPilot: books.filter((book) => book.action === 'REUSE_PILOT').length,
    booksSkipped: books.filter((book) => book.status === 'SKIPPED').length,
    relationsReady: duplicateRelations.filter((relation) => relation.status === 'READY').length,
    relationsSkipped: duplicateRelations.filter((relation) => relation.status !== 'READY').length,
    editionsReady: editions.filter(
      (edition) => edition.status === 'READY' || edition.status === 'REUSED_FROM_PILOT',
    ).length,
    authorImagesReady: authorImages.filter((image) => image.status === 'READY').length,
    authorImagesManualOrNoImage: authorImages.filter((image) => image.status !== 'READY').length,
    bookCoversReady: bookCovers.filter((image) => image.status === 'READY').length,
    bookCoversManualLowNoCover: bookCovers.filter((image) => image.status !== 'READY').length,
    batches: batches.length,
    pilotMappingsReconciled:
      effectiveAuthors.filter((author) => author.action === 'REUSE_PILOT').length +
      books.filter((book) => book.action === 'REUSE_PILOT').length,
    blockers: conflicts.filter((conflict) => conflict.severity === 'error').length,
    backupRequiredBeforeApply: true,
  };

  assertTotals({
    expectedAuthors: effectiveAuthors.length,
    authors,
    expectedBooks: books.length,
    books,
    conflicts,
  });

  return {
    generatedAt,
    mode,
    batchSize,
    authors: effectiveAuthors,
    books,
    relations: duplicateRelations,
    editions,
    authorImages,
    bookCovers,
    batches,
    conflicts,
    manifest,
    result,
    rollbackPlan,
    authorDeduplicationMap,
    summary,
  };
}

function createAuthorPlans(
  authors: MassAuthorPlan[],
  pilotIdsByCandidateKey: Map<string, string>,
): MassApplyPlan['authors'] {
  const slugCounts = new Map<string, number>();

  for (const author of authors) {
    const slug = author.input.slug;
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  return authors.map((author) => {
    const duplicateGroup = readString(author.sourceMetadata.possibleDuplicateGroup);
    const needsAuthorDeduplication = Boolean(duplicateGroup);
    const resolvedSlug =
      (slugCounts.get(author.input.slug) ?? 0) > 1
        ? createLegacySlug(author.input.slug, author.sourceWpPostId)
        : author.input.slug;
    const pilotTargetId = pilotIdsByCandidateKey.get(author.candidateKey) ?? null;
    const input = {
      ...author.input,
      slug: resolvedSlug,
      isPublished: false,
      isFeatured: false,
    };

    return {
      candidateKey: author.candidateKey,
      sourceWpPostId: author.sourceWpPostId,
      status: pilotTargetId ? ('REUSED_FROM_PILOT' as const) : ('READY' as const),
      action: pilotTargetId ? ('REUSE_PILOT' as const) : ('CREATE' as const),
      input,
      originalSlug: author.input.slug,
      resolvedSlug,
      strategy: needsAuthorDeduplication
        ? ('PRESERVE_SEPARATE_PENDING_DEDUPLICATION' as const)
        : ('PRESERVE' as const),
      needsAuthorDeduplication,
      pilotTargetId,
      warnings: [
        ...author.warnings,
        ...(needsAuthorDeduplication
          ? ['Autor en duplicateGroup; se preserva separado para futura fusion.']
          : []),
      ],
      blockingReasons: [],
      sourceMetadata: {
        ...author.sourceMetadata,
        sourceWpPostId: author.sourceWpPostId,
        needsAuthorDeduplication,
        duplicateGroup,
      },
    };
  });
}

function createBookPlans(
  books: MassBookPlan[],
  relations: MassRelationPlan[],
  pilotIdsByCandidateKey: Map<string, string>,
): MassApplyBookPlan[] {
  return books.map((book) => {
    const authorCandidateKeys = relations
      .filter(
        (relation) =>
          relation.bookCandidateKey === book.candidateKey && relation.confidence === 'high',
      )
      .map((relation) => relation.authorCandidateKey);
    const pilotTargetId = pilotIdsByCandidateKey.get(book.candidateKey) ?? null;
    const isBookR = book.candidateKey === 'book:r';
    const status: MassApplyStatus = isBookR
      ? 'SKIPPED'
      : pilotTargetId
        ? 'REUSED_FROM_PILOT'
        : 'READY';

    return {
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      status,
      action: isBookR ? 'SKIP' : pilotTargetId ? 'REUSE_PILOT' : 'CREATE',
      input: {
        ...book.input,
        isPublished: false,
        isFeatured: false,
        authorIds: authorCandidateKeys.map(deterministicUuid),
        editions: [placeholderEdition],
      },
      authorCandidateKeys,
      pilotTargetId,
      warnings: [
        ...book.warnings,
        ...(isBookR ? ['SKIPPED_MANUAL_REVIEW: INVALID_OR_UNVERIFIED_TITLE'] : []),
      ],
      blockingReasons: isBookR ? ['INVALID_OR_UNVERIFIED_TITLE'] : [],
      sourceMetadata: {
        ...book.sourceMetadata,
        sourceWpPostId: book.sourceWpPostId,
      },
    };
  });
}

function createRelationPlans(
  relations: MassRelationPlan[],
  authorsByKey: Map<string, MassApplyPlan['authors'][number]>,
  booksByKey: Map<string, MassApplyBookPlan>,
): MassApplyRelationPlan[] {
  return relations.map((relation) => {
    const author = authorsByKey.get(relation.authorCandidateKey);
    const book = booksByKey.get(relation.bookCandidateKey);
    const blockingReasons: string[] = [];

    if (!author) {
      blockingReasons.push('Autor no planificado.');
    }

    if (!book || book.status === 'SKIPPED') {
      blockingReasons.push('Libro no migrable.');
    }

    if (relation.confidence !== 'high') {
      return {
        relationKey: createRelationKey(relation.bookCandidateKey, relation.authorCandidateKey),
        bookCandidateKey: relation.bookCandidateKey,
        authorCandidateKey: relation.authorCandidateKey,
        sourceWpPostId: relation.sourceWpPostId,
        status: 'MANUAL_REVIEW',
        action: 'MANUAL_REVIEW',
        confidence: relation.confidence,
        reason: relation.reason,
        warnings: ['Relacion sin confidence high.'],
        blockingReasons: [],
      };
    }

    return {
      relationKey: createRelationKey(relation.bookCandidateKey, relation.authorCandidateKey),
      bookCandidateKey: relation.bookCandidateKey,
      authorCandidateKey: relation.authorCandidateKey,
      sourceWpPostId: relation.sourceWpPostId,
      status: blockingReasons.length > 0 ? 'SKIPPED' : 'READY',
      action: blockingReasons.length > 0 ? 'SKIP' : 'CREATE',
      confidence: relation.confidence,
      reason: relation.reason,
      warnings: [],
      blockingReasons,
    };
  });
}

function dedupeRelationPlans(relations: MassApplyRelationPlan[]) {
  const seen = new Set<string>();
  const result: MassApplyRelationPlan[] = [];

  for (const relation of relations) {
    if (seen.has(relation.relationKey)) {
      result.push({
        ...relation,
        status: 'SKIPPED',
        action: 'SKIP',
        warnings: [...relation.warnings, 'Relacion exacta duplicada deduplicada en planificacion.'],
      });
      continue;
    }

    seen.add(relation.relationKey);
    result.push(relation);
  }

  return result;
}

function createAuthorImagePlans(
  images: MassAuthorImagePlan[],
  authorsByKey: Map<string, MassApplyPlan['authors'][number]>,
): MassApplyImagePlan[] {
  return images.map((image) => {
    const author = authorsByKey.get(image.authorCandidateKey);
    const status =
      image.status === 'AUTO_UPLOAD'
        ? author
          ? 'READY'
          : 'MANUAL_REVIEW'
        : image.status === 'NO_IMAGE'
          ? 'NO_IMAGE'
          : image.status;

    return {
      candidateKey: image.authorCandidateKey,
      entityType: 'author',
      sourceWpPostId: image.sourceWpPostId,
      attachmentId: image.attachmentId,
      filename: image.filename,
      url: image.url,
      status,
      action: status === 'READY' ? 'UPLOAD' : status === 'NO_IMAGE' ? 'SKIP' : 'MANUAL_REVIEW',
      confidence: image.confidence,
      reasons: image.reasons,
    };
  });
}

function createBookCoverPlans(
  covers: MassBookCoverPlan[],
  booksByKey: Map<string, MassApplyBookPlan>,
): MassApplyImagePlan[] {
  return covers.map((cover) => {
    const book = booksByKey.get(cover.bookCandidateKey);
    const hasValidHighCandidate =
      cover.status === 'AUTO_UPLOAD_CANDIDATE' &&
      cover.confidence === 'high' &&
      Boolean(cover.attachmentId) &&
      Boolean(cover.url) &&
      Boolean(book) &&
      book?.status !== 'SKIPPED';
    const status = hasValidHighCandidate
      ? 'READY'
      : cover.status === 'NO_COVER'
        ? 'NO_COVER'
        : 'MANUAL_REVIEW';

    return {
      candidateKey: cover.bookCandidateKey,
      entityType: 'book',
      sourceWpPostId: cover.sourceWpPostId,
      attachmentId: cover.attachmentId,
      filename: cover.filename,
      url: cover.url,
      status,
      action: status === 'READY' ? 'UPLOAD' : status === 'NO_COVER' ? 'SKIP' : 'MANUAL_REVIEW',
      confidence: cover.confidence,
      reasons: cover.reasons,
    };
  });
}

function createManifest(params: {
  generatedAt: string;
  mode: MassApplyPlan['mode'];
  authors: MassApplyPlan['authors'];
  books: MassApplyBookPlan[];
  relations: MassApplyRelationPlan[];
  editions: MassApplyPlan['editions'];
  authorImages: MassApplyImagePlan[];
  bookCovers: MassApplyImagePlan[];
}): MassApplyManifest {
  const entries: MassApplyManifestEntry[] = [
    ...params.authors.map((author) =>
      createManifestEntry(
        params.generatedAt,
        'author',
        author.candidateKey,
        author.sourceWpPostId,
        author.pilotTargetId,
        author.status,
        author.warnings,
        author.sourceMetadata,
      ),
    ),
    ...params.books.map((book) =>
      createManifestEntry(
        params.generatedAt,
        'book',
        book.candidateKey,
        book.sourceWpPostId,
        book.pilotTargetId,
        book.status,
        book.warnings,
        book.sourceMetadata,
      ),
    ),
    ...params.relations.map((relation) =>
      createManifestEntry(
        params.generatedAt,
        'relation',
        relation.relationKey,
        relation.sourceWpPostId,
        null,
        relation.status,
        relation.warnings,
        {},
      ),
    ),
    ...params.editions.map((edition) =>
      createManifestEntry(
        params.generatedAt,
        'edition',
        edition.bookCandidateKey,
        edition.sourceWpPostId,
        null,
        edition.status,
        edition.warnings,
        { inferredEdition: true },
      ),
    ),
    ...params.authorImages.map((image) =>
      createManifestEntry(
        params.generatedAt,
        'author_image',
        image.candidateKey,
        image.sourceWpPostId,
        null,
        image.status,
        [],
        {},
      ),
    ),
    ...params.bookCovers.map((image) =>
      createManifestEntry(
        params.generatedAt,
        'book_cover',
        image.candidateKey,
        image.sourceWpPostId,
        null,
        image.status,
        [],
        {},
      ),
    ),
  ];

  return {
    generatedAt: params.generatedAt,
    mode: params.mode,
    entries,
  };
}

function createManifestEntry(
  generatedAt: string,
  entityType: MassApplyManifestEntry['entityType'],
  candidateKey: string,
  sourceWpPostId: string,
  targetId: string | null,
  status: MassApplyStatus | 'TOO_LARGE' | 'NO_IMAGE' | 'NO_COVER',
  warnings: string[],
  sourceMetadata: Record<string, string | boolean | null>,
): MassApplyManifestEntry {
  const preexisting = Boolean(targetId);
  const manifestStatus: MassApplyManifestEntry['status'] = preexisting
    ? 'applied'
    : status === 'READY'
      ? 'planned'
      : status === 'SKIPPED' || status === 'NO_IMAGE' || status === 'NO_COVER'
        ? 'skipped'
        : 'manual_action_required';

  return {
    candidateKey,
    entityType,
    sourceWpPostId,
    targetId,
    status: manifestStatus,
    checkpoint: preexisting
      ? 'pilot_reconciled'
      : manifestStatus === 'planned'
        ? 'planned'
        : manifestStatus === 'skipped'
          ? 'skipped'
          : 'manual_action_required',
    createdAt: generatedAt,
    updatedAt: generatedAt,
    warnings,
    sourceMetadata,
    preexisting,
  };
}

function createRollbackPlan(
  generatedAt: string,
  manifest: MassApplyManifest,
): MassApplyRollbackPlan {
  return {
    generatedAt,
    resources: {
      authors: manifest.entries
        .filter((entry) => entry.entityType === 'author' && entry.targetId)
        .map((entry) => ({
          id: entry.targetId ?? '',
          candidateKey: entry.candidateKey,
          preexisting: entry.preexisting,
        })),
      books: manifest.entries
        .filter((entry) => entry.entityType === 'book' && entry.targetId)
        .map((entry) => ({
          id: entry.targetId ?? '',
          candidateKey: entry.candidateKey,
          preexisting: entry.preexisting,
        })),
      editions: [],
      relations: [],
      storagePaths: [],
    },
    warnings: ['Rollback destructivo excluye recursos preexisting=true del piloto.'],
  };
}

function createAuthorDeduplicationMap(
  originalAuthors: MassAuthorPlan[],
  plannedAuthors: MassApplyPlan['authors'],
  relations: MassRelationPlan[],
): AuthorDeduplicationMapGroup[] {
  const byGroup = new Map<string, MassAuthorPlan[]>();
  const plannedByKey = new Map(plannedAuthors.map((author) => [author.candidateKey, author]));

  for (const author of originalAuthors) {
    const duplicateGroup = readString(author.sourceMetadata.possibleDuplicateGroup);

    if (!duplicateGroup) {
      continue;
    }

    byGroup.set(duplicateGroup, [...(byGroup.get(duplicateGroup) ?? []), author]);
  }

  return [...byGroup.entries()].map(([duplicateGroup, authors]) => ({
    duplicateGroup,
    legacyCandidateKeys: authors.map((author) => author.candidateKey),
    targetIds: Object.fromEntries(
      authors.map((author) => [
        author.candidateKey,
        plannedByKey.get(author.candidateKey)?.pilotTargetId ?? null,
      ]),
    ),
    proposedCanonical: null,
    associatedBooks: Object.fromEntries(
      authors.map((author) => [
        author.candidateKey,
        relations
          .filter((relation) => relation.authorCandidateKey === author.candidateKey)
          .map((relation) => relation.bookCandidateKey),
      ]),
    ),
    photoConflicts: false,
    biographyConflicts: true,
  }));
}

function createBatches(
  entities: Array<
    { candidateKey: string } | { relationKey: string } | { bookCandidateKey: string }
  >,
  batchSize: number,
): MassApplyBatch[] {
  const keys = entities.map((entity) =>
    'candidateKey' in entity
      ? entity.candidateKey
      : 'relationKey' in entity
        ? entity.relationKey
        : entity.bookCandidateKey,
  );
  const batches: MassApplyBatch[] = [];

  for (let index = 0; index < keys.length; index += batchSize) {
    batches.push({
      index: batches.length + 1,
      entityType: 'author',
      candidateKeys: keys.slice(index, index + batchSize),
    });
  }

  return batches;
}

function createInitialResult(
  generatedAt: string,
  authors: MassApplyPlan['authors'],
  books: MassApplyBookPlan[],
  relations: MassApplyRelationPlan[],
  editions: MassApplyPlan['editions'],
  authorImages: MassApplyImagePlan[],
  bookCovers: MassApplyImagePlan[],
) {
  return {
    generatedAt,
    authorsCreated: 0,
    authorsReusedFromPilot: authors.filter((author) => author.action === 'REUSE_PILOT').length,
    booksCreated: 0,
    booksReusedFromPilot: books.filter((book) => book.action === 'REUSE_PILOT').length,
    editionsCreated: 0,
    relationsCreated: 0,
    authorImagesUploaded: 0,
    bookCoversUploaded: 0,
    skipped:
      authors.filter((author) => author.action === 'SKIP').length +
      books.filter((book) => book.action === 'SKIP').length +
      relations.filter((relation) => relation.action === 'SKIP').length +
      editions.filter((edition) => edition.action === 'SKIP').length,
    manualActionRequired:
      authorImages.filter((image) => image.action === 'MANUAL_REVIEW').length +
      bookCovers.filter((image) => image.action === 'MANUAL_REVIEW').length,
    partial: 0,
    failed: 0,
  };
}

function assertTotals(params: {
  expectedAuthors: number;
  authors: MassApplyPlan['authors'];
  expectedBooks: number;
  books: MassApplyBookPlan[];
  conflicts: MassApplyConflict[];
}) {
  const authorTotal = params.authors.length;
  const bookTotal = params.books.length;

  if (authorTotal !== params.expectedAuthors || bookTotal !== params.expectedBooks) {
    params.conflicts.push({
      code: 'TOTAL_RECONCILIATION_FAILED',
      severity: 'error',
      entityType: 'runtime',
      candidateKey: 'totals',
      message: 'Los totales del plan preserve no cuadran.',
      details: `authors=${authorTotal}/${params.expectedAuthors} books=${bookTotal}/${params.expectedBooks}`,
    });
  }
}

function getPilotMappings(pilotManifest?: PilotManifest | null) {
  const authorIdsByCandidateKey = new Map<string, string>();
  const bookIdsByCandidateKey = new Map<string, string>();

  for (const entry of pilotManifest?.entries ?? []) {
    if (!entry.targetId || (entry.status !== 'applied' && entry.status !== 'partial')) {
      continue;
    }

    if (entry.sourceType === 'author') {
      authorIdsByCandidateKey.set(entry.candidateKey, entry.targetId);
    }

    if (entry.sourceType === 'book') {
      bookIdsByCandidateKey.set(entry.candidateKey, entry.targetId);
    }
  }

  return { authorIdsByCandidateKey, bookIdsByCandidateKey };
}

function createLegacySlug(slug: string, sourceWpPostId: string) {
  return normalizeAuthorSlug(`${slug}-wp-${sourceWpPostId}`);
}

function createRelationKey(bookCandidateKey: string, authorCandidateKey: string) {
  return `${bookCandidateKey}::${authorCandidateKey}`;
}

function deterministicUuid(value: string) {
  const hash = createHash('sha256').update(value).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function normalizeBatchSize(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

function limitKeys(keys: string[], limit?: number) {
  if (!limit || limit <= 0) {
    return keys;
  }

  return keys.slice(0, limit);
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
