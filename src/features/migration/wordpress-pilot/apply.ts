import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';
import type { CreateBookInput, UpdateBookInput } from '@/schemas/books/book.schema';
import { assertPilotApplyEnvironment } from './env';
import type { PilotCheckpointWriter } from './output';
import type {
  PilotManifest,
  PilotManifestEntry,
  PilotPlan,
  PilotPlanAuthor,
  PilotPlanBook,
  PilotPlanIssue,
  PilotResult,
} from './types';

const imageDownloadTimeoutMs = 15_000;
const imageDownloadMaxRetries = 2;
const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const maxImageSizeBytes = 5 * 1024 * 1024;

interface DownloadedImage {
  file: File;
  mimeType: (typeof allowedImageMimeTypes)[number];
}

export interface PilotApplyAuthor {
  id: string;
  slug: string;
}

export interface PilotApplyBook {
  id: string;
  slug: string;
  editions: { id: string }[];
}

export interface PilotApplyImageResult {
  path: string;
  publicUrl: string;
}

export interface PilotApplyServices {
  authors: {
    getAuthorBySlug(slug: string): Promise<PilotApplyAuthor>;
    createAuthor(input: CreateAuthorInput): Promise<PilotApplyAuthor>;
    updateAuthor(id: string, input: UpdateAuthorInput): Promise<PilotApplyAuthor | null>;
  };
  books: {
    getBookBySlug(slug: string): Promise<PilotApplyBook>;
    createBook(input: CreateBookInput): Promise<PilotApplyBook>;
    updateBook(id: string, input: UpdateBookInput): Promise<PilotApplyBook | null>;
  };
  authorImages: {
    uploadAuthorImage(authorId: string, file: File): Promise<PilotApplyImageResult>;
    deleteAuthorImage(path: string): Promise<void>;
  };
  bookCovers: {
    uploadBookCover(bookId: string, file: File): Promise<PilotApplyImageResult>;
    deleteBookCover(publicUrl: string | null): Promise<void>;
  };
  downloadImage?: (url: string, candidateKey: string) => Promise<DownloadedImage>;
}

export interface PilotApplyOptions {
  existingManifest?: PilotManifest | null;
  checkpointWriter?: PilotCheckpointWriter;
  services?: PilotApplyServices;
  skipEnvironmentCheck?: boolean;
  retryImagesOnly?: boolean;
}

class PilotImageTooLargeError extends Error {
  constructor() {
    super('Image exceeds 5 MB');
    this.name = 'PilotImageTooLargeError';
  }
}

function isImageTooLargeError(error: unknown): error is Error {
  return (
    error instanceof PilotImageTooLargeError ||
    (error instanceof Error && error.message === 'Image exceeds 5 MB')
  );
}

function addIssue(
  issues: PilotPlanIssue[],
  issue: Omit<PilotPlanIssue, 'details'> & { details?: string },
) {
  issues.push({
    details: issue.details ?? '',
    ...issue,
  });
}

export function createPilotImageFailureIssue(
  candidateKey: string,
  sourceWpPostId: string,
  error: unknown,
): PilotPlanIssue {
  if (isImageTooLargeError(error)) {
    return {
      severity: 'warning',
      code: 'IMAGE_TOO_LARGE',
      candidateKey,
      sourceWpPostId,
      message: 'La imagen piloto supera los 5 MB y requiere revisión manual antes de migrarla.',
      details: error.message,
    };
  }

  return {
    severity: 'warning',
    code: 'PILOT_IMAGE_FAILED',
    candidateKey,
    sourceWpPostId,
    message: 'No se pudo migrar la imagen piloto. El registro principal se conserva.',
    details: error instanceof Error ? error.message : 'Unknown error',
  };
}

function isAllowedImageMimeType(value: string): value is DownloadedImage['mimeType'] {
  return allowedImageMimeTypes.some((mimeType) => mimeType === value);
}

function getExtension(mimeType: DownloadedImage['mimeType']) {
  return mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), imageDownloadTimeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadImage(url: string, candidateKey: string): Promise<DownloadedImage> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= imageDownloadMaxRetries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';

      if (!isAllowedImageMimeType(mimeType)) {
        throw new Error(`Unsupported MIME ${mimeType}`);
      }

      const body = await response.arrayBuffer();

      if (body.byteLength <= 0) {
        throw new Error('Empty image body');
      }

      if (body.byteLength > maxImageSizeBytes) {
        throw new PilotImageTooLargeError();
      }

      return {
        file: new File([body], `${candidateKey}.${getExtension(mimeType)}`, { type: mimeType }),
        mimeType,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function isNotFoundError(error: unknown, expectedName: string) {
  return error instanceof Error && error.name === expectedName;
}

function getManifestEntry(
  manifest: PilotManifest | undefined | null,
  sourceType: PilotManifestEntry['sourceType'],
  candidateKey: string,
) {
  return manifest?.entries.find(
    (entry) => entry.sourceType === sourceType && entry.candidateKey === candidateKey,
  );
}

function getAppliedTargetId(
  manifest: PilotManifest | undefined | null,
  sourceType: 'author' | 'book',
  candidateKey: string,
) {
  const entry = getManifestEntry(manifest, sourceType, candidateKey);

  return entry?.status === 'applied' && entry.targetId ? entry.targetId : null;
}

function getReusableAuthorTargetId(
  manifest: PilotManifest | undefined | null,
  candidateKey: string,
) {
  const entry = getManifestEntry(manifest, 'author', candidateKey);

  if (
    entry?.targetId &&
    (entry.status === 'applied' || entry.status === 'partial') &&
    entry.targetEntityType === 'authors'
  ) {
    return entry.targetId;
  }

  return null;
}

function getReusableBookTargetId(manifest: PilotManifest | undefined | null, candidateKey: string) {
  const entry = getManifestEntry(manifest, 'book', candidateKey);

  if (
    entry?.targetId &&
    (entry.status === 'applied' || entry.status === 'partial') &&
    entry.targetEntityType === 'books'
  ) {
    return entry.targetId;
  }

  return null;
}

function updateManifestEntry(
  plan: PilotPlan,
  sourceType: PilotManifestEntry['sourceType'],
  candidateKey: string,
  updates: Partial<PilotManifestEntry>,
) {
  const entry = getManifestEntry(plan.manifest, sourceType, candidateKey);

  if (!entry) {
    return;
  }

  Object.assign(entry, updates);
}

function mergeImageMetadata(
  plan: PilotPlan,
  candidateKey: string,
  metadata: Record<string, string | boolean | null>,
) {
  const entry = getManifestEntry(plan.manifest, 'image', candidateKey);

  if (!entry) {
    return;
  }

  entry.sourceMetadata = {
    ...entry.sourceMetadata,
    ...metadata,
  };
}

function getStringMetadata(
  metadata: Record<string, string | boolean | null>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function persistCheckpoint(
  writer: PilotCheckpointWriter | undefined,
  plan: PilotPlan,
  result: PilotResult,
) {
  if (!writer) {
    return;
  }

  await writer.persist(plan, result);
}

async function getDefaultServices(): Promise<PilotApplyServices> {
  const authorService = await import('@/services/authors/author.service');
  const bookService = await import('@/services/books/book.service');
  const { createPilotMigrationStorageServices } = await import('./storage-services');
  const storageServices = createPilotMigrationStorageServices();

  return {
    authors: authorService,
    books: bookService,
    authorImages: storageServices.authorImages,
    bookCovers: storageServices.bookCovers,
  };
}

function createInitialApplyResult(plan: PilotPlan): PilotResult {
  return {
    generatedAt: new Date().toISOString(),
    planned:
      plan.authors.filter((author) => author.status === 'planned').length +
      plan.books.filter((book) => book.status === 'planned').length +
      plan.relations.filter((relation) => relation.status === 'planned').length +
      plan.editions.filter((edition) => edition.status === 'planned').length +
      plan.images.filter((image) => image.status === 'planned').length,
    createdAuthors: 0,
    createdBooks: 0,
    createdRelations: 0,
    createdEditions: 0,
    uploadedAuthorImages: 0,
    uploadedBookCovers: 0,
    skipped: 0,
    partial: 0,
    failed: 0,
    issues: [...plan.issues],
  };
}

function addUnexpectedApplyIssue(result: PilotResult, error: unknown) {
  result.failed += 1;
  addIssue(result.issues, {
    severity: 'error',
    code: 'PILOT_APPLY_UNEXPECTED_ERROR',
    candidateKey: '',
    sourceWpPostId: '',
    message: 'El apply del piloto se interrumpio por un error inesperado.',
    details: error instanceof Error ? error.message : 'Unknown error',
  });
}

function validateInternalPlanConsistency(plan: PilotPlan, result: PilotResult) {
  const plannedAuthorSlugs = new Set<string>();
  const plannedBookSlugs = new Set<string>();

  for (const author of plan.authors.filter((item) => item.status === 'planned')) {
    if (plannedAuthorSlugs.has(author.input.slug)) {
      addIssue(result.issues, {
        severity: 'error',
        code: 'DUPLICATE_AUTHOR_SLUG_IN_APPLY_PLAN',
        candidateKey: author.candidateKey,
        sourceWpPostId: author.sourceWpPostId,
        message: 'El plan contiene dos autores con el mismo slug.',
        details: author.input.slug,
      });
    }

    plannedAuthorSlugs.add(author.input.slug);
  }

  for (const book of plan.books.filter((item) => item.status === 'planned')) {
    if (plannedBookSlugs.has(book.input.slug)) {
      addIssue(result.issues, {
        severity: 'error',
        code: 'DUPLICATE_BOOK_SLUG_IN_APPLY_PLAN',
        candidateKey: book.candidateKey,
        sourceWpPostId: book.sourceWpPostId,
        message: 'El plan contiene dos libros con el mismo slug.',
        details: book.input.slug,
      });
    }

    plannedBookSlugs.add(book.input.slug);
  }

  for (const relation of plan.relations.filter((item) => item.status === 'planned')) {
    const book = plan.books.find((item) => item.candidateKey === relation.bookCandidateKey);
    const author = plan.authors.find((item) => item.candidateKey === relation.authorCandidateKey);

    if (!book || !author) {
      addIssue(result.issues, {
        severity: 'error',
        code: 'INVALID_RELATION_IN_APPLY_PLAN',
        candidateKey: relation.bookCandidateKey,
        sourceWpPostId: relation.sourceWpPostId,
        message: 'La relacion apunta a un autor o libro no incluido en el plan.',
        details: relation.authorCandidateKey,
      });
    }
  }
}

async function runSlugPreflight(
  plan: PilotPlan,
  result: PilotResult,
  services: PilotApplyServices,
  existingManifest?: PilotManifest | null,
) {
  for (const author of plan.authors.filter((item) => item.status === 'planned')) {
    if (getAppliedTargetId(existingManifest, 'author', author.candidateKey)) {
      continue;
    }

    try {
      await services.authors.getAuthorBySlug(author.input.slug);
      addIssue(result.issues, {
        severity: 'error',
        code: 'EXISTING_AUTHOR_SLUG_REQUIRES_RECONCILIATION',
        candidateKey: author.candidateKey,
        sourceWpPostId: author.sourceWpPostId,
        message: 'Ya existe un autor con este slug fuera del manifest del piloto.',
        details: author.input.slug,
      });
    } catch (error) {
      if (!isNotFoundError(error, 'AuthorNotFoundError')) {
        throw error;
      }
    }
  }

  for (const book of plan.books.filter((item) => item.status === 'planned')) {
    if (getAppliedTargetId(existingManifest, 'book', book.candidateKey)) {
      continue;
    }

    try {
      await services.books.getBookBySlug(book.input.slug);
      addIssue(result.issues, {
        severity: 'error',
        code: 'EXISTING_BOOK_SLUG_REQUIRES_RECONCILIATION',
        candidateKey: book.candidateKey,
        sourceWpPostId: book.sourceWpPostId,
        message: 'Ya existe un libro con este slug fuera del manifest del piloto.',
        details: book.input.slug,
      });
    } catch (error) {
      if (!isNotFoundError(error, 'BookNotFoundError')) {
        throw error;
      }
    }
  }
}

async function runPreflight(
  plan: PilotPlan,
  result: PilotResult,
  services: PilotApplyServices,
  existingManifest: PilotManifest | null | undefined,
) {
  validateInternalPlanConsistency(plan, result);
  await runSlugPreflight(plan, result, services, existingManifest);
}

function getAppliedImageEntry(
  existingManifest: PilotManifest | null | undefined,
  candidateKey: string,
  attachmentUrl: string,
  role: string,
) {
  return existingManifest?.entries.find(
    (entry) =>
      entry.sourceType === 'image' &&
      entry.candidateKey === candidateKey &&
      entry.status === 'applied' &&
      entry.imageStatus === 'uploaded' &&
      entry.sourceMetadata.attachmentUrl === attachmentUrl &&
      entry.sourceMetadata.role === role,
  );
}

function getExistingImageEntry(
  existingManifest: PilotManifest | null | undefined,
  candidateKey: string,
  attachmentUrl: string,
  role: string,
) {
  return existingManifest?.entries.find(
    (entry) =>
      entry.sourceType === 'image' &&
      entry.candidateKey === candidateKey &&
      entry.sourceMetadata.attachmentUrl === attachmentUrl &&
      entry.sourceMetadata.role === role,
  );
}

function getExistingEntityEntry(
  existingManifest: PilotManifest | null | undefined,
  sourceType: 'author' | 'book',
  candidateKey: string,
) {
  return existingManifest?.entries.find(
    (entry) => entry.sourceType === sourceType && entry.candidateKey === candidateKey,
  );
}

function isRetryableImageEntry(existingImageEntry: PilotManifestEntry | undefined) {
  return (
    Boolean(existingImageEntry) &&
    (existingImageEntry?.status === 'partial' || existingImageEntry?.status === 'failed') &&
    existingImageEntry?.imageStatus === 'failed'
  );
}

function isEntityWaitingForImage(existingEntityEntry: PilotManifestEntry | undefined) {
  return (
    existingEntityEntry?.status === 'partial' && existingEntityEntry.checkpoint === 'image_failed'
  );
}

function requiresStorageMigrationCredentials(
  plan: PilotPlan,
  existingManifest: PilotManifest | null | undefined,
) {
  return plan.images.some(
    (image) =>
      image.status === 'planned' &&
      !getAppliedImageEntry(existingManifest, image.candidateKey, image.attachmentUrl, image.role),
  );
}

function resolveBookAuthorIds(
  book: PilotPlanBook,
  context: {
    result: PilotResult;
    authorIdsByCandidateKey: Map<string, string>;
    existingManifest?: PilotManifest | null;
  },
) {
  const authorIds: string[] = [];
  const missingAuthorCandidateKeys: string[] = [];

  for (const authorCandidateKey of book.input.authorCandidateKeys) {
    const authorId =
      context.authorIdsByCandidateKey.get(authorCandidateKey) ??
      getReusableAuthorTargetId(context.existingManifest, authorCandidateKey);

    if (!authorId) {
      missingAuthorCandidateKeys.push(authorCandidateKey);
      continue;
    }

    authorIds.push(authorId);
  }

  if (missingAuthorCandidateKeys.length > 0) {
    addIssue(context.result.issues, {
      severity: 'error',
      code: 'PILOT_AUTHOR_MAPPING_MISSING',
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      message: 'No se pudo resolver el UUID destino de uno o más autores del libro piloto.',
      details: missingAuthorCandidateKeys.join(', '),
    });

    return null;
  }

  return authorIds;
}

function createBookDomainInput(book: PilotPlanBook, authorIds: string[]): CreateBookInput {
  return {
    title: book.input.title,
    subtitle: book.input.subtitle,
    slug: book.input.slug,
    description: book.input.description,
    excerpt: book.input.excerpt,
    coverUrl: book.input.coverUrl,
    originalPublicationDate: book.input.originalPublicationDate,
    language: book.input.language,
    isFeatured: book.input.isFeatured,
    isPublished: book.input.isPublished,
    sortOrder: book.input.sortOrder,
    metaTitle: book.input.metaTitle,
    metaDescription: book.input.metaDescription,
    canonicalUrl: book.input.canonicalUrl,
    authorIds,
    categoryIds: book.input.categoryIds,
    editions: book.input.editions,
  };
}

function primeTargetIdsFromManifest(context: {
  plan: PilotPlan;
  existingManifest?: PilotManifest | null;
  authorIdsByCandidateKey: Map<string, string>;
  bookIdsByCandidateKey: Map<string, string>;
}) {
  for (const author of context.plan.authors) {
    const authorId = getReusableAuthorTargetId(context.existingManifest, author.candidateKey);

    if (authorId) {
      context.authorIdsByCandidateKey.set(author.candidateKey, authorId);
    }
  }

  for (const book of context.plan.books) {
    const bookId = getReusableBookTargetId(context.existingManifest, book.candidateKey);

    if (bookId) {
      context.bookIdsByCandidateKey.set(book.candidateKey, bookId);
    }
  }
}

async function applyAuthor(
  author: PilotPlanAuthor,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    authorIdsByCandidateKey: Map<string, string>;
    existingManifest?: PilotManifest | null;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const existingId = getAppliedTargetId(context.existingManifest, 'author', author.candidateKey);

  if (existingId) {
    context.authorIdsByCandidateKey.set(author.candidateKey, existingId);
    updateManifestEntry(context.plan, 'author', author.candidateKey, {
      targetId: existingId,
      status: 'applied',
      checkpoint: 'author_created',
    });
    context.result.skipped += 1;
    await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
    return;
  }

  if (author.status !== 'planned') {
    context.result.skipped += 1;
    return;
  }

  const createdAuthor = await context.services.authors.createAuthor(author.input);
  context.authorIdsByCandidateKey.set(author.candidateKey, createdAuthor.id);
  updateManifestEntry(context.plan, 'author', author.candidateKey, {
    targetId: createdAuthor.id,
    status: 'applied',
    checkpoint: 'author_created',
  });
  context.result.createdAuthors += 1;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

async function applyBook(
  book: PilotPlanBook,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    authorIdsByCandidateKey: Map<string, string>;
    bookIdsByCandidateKey: Map<string, string>;
    existingManifest?: PilotManifest | null;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const existingId = getAppliedTargetId(context.existingManifest, 'book', book.candidateKey);

  if (existingId) {
    context.bookIdsByCandidateKey.set(book.candidateKey, existingId);
    updateManifestEntry(context.plan, 'book', book.candidateKey, {
      targetId: existingId,
      status: 'applied',
      checkpoint: 'book_created',
    });
    context.result.skipped += 1;
    await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
    return;
  }

  if (book.status !== 'planned') {
    context.result.skipped += 1;
    return;
  }

  const authorIds = resolveBookAuthorIds(book, context);

  if (!authorIds) {
    updateManifestEntry(context.plan, 'book', book.candidateKey, {
      status: 'failed',
      checkpoint: 'author_mapping_missing',
    });
    context.result.failed += 1;
    await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
    return;
  }

  const createInput = createBookDomainInput(book, authorIds);
  const createdBook = await context.services.books.createBook(createInput);
  context.bookIdsByCandidateKey.set(book.candidateKey, createdBook.id);
  updateManifestEntry(context.plan, 'book', book.candidateKey, {
    targetId: createdBook.id,
    status: 'applied',
    checkpoint: 'book_created',
  });

  for (const authorCandidateKey of book.input.authorCandidateKeys) {
    updateManifestEntry(context.plan, 'relation', `${book.candidateKey}:${authorCandidateKey}`, {
      targetId: createdBook.id,
      status: 'applied',
      checkpoint: 'book_created',
    });
  }

  updateManifestEntry(context.plan, 'edition', book.candidateKey, {
    targetId: createdBook.editions[0]?.id ?? createdBook.id,
    status: 'applied',
    checkpoint: 'book_created',
  });

  context.result.createdBooks += 1;
  context.result.createdRelations += authorIds.length;
  context.result.createdEditions += book.input.editions.length;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

async function applyImages(context: {
  plan: PilotPlan;
  result: PilotResult;
  services: PilotApplyServices;
  authorIdsByCandidateKey: Map<string, string>;
  bookIdsByCandidateKey: Map<string, string>;
  existingManifest?: PilotManifest | null;
  checkpointWriter?: PilotCheckpointWriter;
  retryImagesOnly?: boolean;
}) {
  const getImage = context.services.downloadImage ?? downloadImage;

  for (const image of context.plan.images) {
    const existingImageEntry = getExistingImageEntry(
      context.existingManifest,
      image.candidateKey,
      image.attachmentUrl,
      image.role,
    );
    const existingEntityEntry = getExistingEntityEntry(
      context.existingManifest,
      image.entityType,
      image.candidateKey,
    );

    if (existingImageEntry?.imageStatus === 'manual_action_required') {
      context.result.skipped += 1;
      continue;
    }

    if (
      context.retryImagesOnly &&
      !isRetryableImageEntry(existingImageEntry) &&
      !isEntityWaitingForImage(existingEntityEntry)
    ) {
      context.result.skipped += 1;
      continue;
    }

    if (image.status !== 'planned') {
      context.result.skipped += 1;
      continue;
    }

    const appliedImageEntry = getAppliedImageEntry(
      context.existingManifest,
      image.candidateKey,
      image.attachmentUrl,
      image.role,
    );

    if (appliedImageEntry) {
      updateManifestEntry(context.plan, 'image', image.candidateKey, {
        targetId: appliedImageEntry.targetId,
        status: 'applied',
        imageStatus: 'uploaded',
        checkpoint: 'complete',
      });
      context.result.skipped += 1;
      await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
      continue;
    }

    try {
      const existingUploadedUrl = existingImageEntry
        ? getStringMetadata(existingImageEntry.sourceMetadata, 'resultingUrl')
        : null;

      if (
        existingImageEntry?.targetId &&
        existingImageEntry.imageStatus === 'failed' &&
        existingUploadedUrl
      ) {
        if (image.entityType === 'author') {
          await persistExistingAuthorImage(image, existingUploadedUrl, context);
        }

        if (image.entityType === 'book') {
          await persistExistingBookCover(image, existingUploadedUrl, context);
        }

        continue;
      }

      const { file } = await getImage(image.attachmentUrl, image.candidateKey);

      if (image.entityType === 'author') {
        await applyAuthorImage(image, file, context);
      }

      if (image.entityType === 'book') {
        await applyBookCover(image, file, context);
      }
    } catch (error) {
      if (isImageTooLargeError(error)) {
        updateManifestEntry(context.plan, 'image', image.candidateKey, {
          status: 'skipped',
          imageStatus: 'manual_action_required',
          checkpoint: 'manual_action_required',
        });
        mergeImageMetadata(context.plan, image.candidateKey, {
          migrationErrorCode: 'IMAGE_TOO_LARGE',
          retryable: false,
          manualActionRequired: true,
        });
        context.result.skipped += 1;
        context.result.issues.push(
          createPilotImageFailureIssue(image.candidateKey, image.sourceWpPostId, error),
        );
        await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
        continue;
      }

      const entityType = image.entityType === 'author' ? 'author' : 'book';

      updateManifestEntry(context.plan, entityType, image.candidateKey, {
        status: 'partial',
        checkpoint: 'image_failed',
      });
      updateManifestEntry(context.plan, 'image', image.candidateKey, {
        status: 'partial',
        imageStatus: 'failed',
        checkpoint: 'image_failed',
      });
      context.result.partial += 1;
      context.result.issues.push(
        createPilotImageFailureIssue(image.candidateKey, image.sourceWpPostId, error),
      );
      await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
    }
  }
}

async function persistExistingAuthorImage(
  image: PilotPlan['images'][number],
  publicUrl: string,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    authorIdsByCandidateKey: Map<string, string>;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const authorId = context.authorIdsByCandidateKey.get(image.candidateKey);

  if (!authorId) {
    throw new Error(`No author targetId for ${image.candidateKey}`);
  }

  await context.services.authors.updateAuthor(authorId, { photoUrl: publicUrl });
  updateManifestEntry(context.plan, 'author', image.candidateKey, {
    status: 'applied',
    checkpoint: 'complete',
  });
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    status: 'applied',
    imageStatus: 'uploaded',
    checkpoint: 'complete',
  });
  context.result.uploadedAuthorImages += 1;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

async function persistExistingBookCover(
  image: PilotPlan['images'][number],
  publicUrl: string,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    bookIdsByCandidateKey: Map<string, string>;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const bookId = context.bookIdsByCandidateKey.get(image.candidateKey);

  if (!bookId) {
    throw new Error(`No book targetId for ${image.candidateKey}`);
  }

  await context.services.books.updateBook(bookId, { coverUrl: publicUrl });
  updateManifestEntry(context.plan, 'book', image.candidateKey, {
    status: 'applied',
    checkpoint: 'complete',
  });
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    status: 'applied',
    imageStatus: 'uploaded',
    checkpoint: 'complete',
  });
  context.result.uploadedBookCovers += 1;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

async function applyAuthorImage(
  image: PilotPlan['images'][number],
  file: File,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    authorIdsByCandidateKey: Map<string, string>;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const authorId = context.authorIdsByCandidateKey.get(image.candidateKey);

  if (!authorId) {
    throw new Error(`No author targetId for ${image.candidateKey}`);
  }

  const uploadedImage = await context.services.authorImages.uploadAuthorImage(authorId, file);
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    targetId: uploadedImage.path,
    status: 'partial',
    imageStatus: 'uploaded',
    checkpoint: 'image_uploaded',
  });
  mergeImageMetadata(context.plan, image.candidateKey, {
    sourceUrl: image.attachmentUrl,
    storagePath: uploadedImage.path,
    resultingUrl: uploadedImage.publicUrl,
    role: image.role,
  });
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);

  try {
    await context.services.authors.updateAuthor(authorId, { photoUrl: uploadedImage.publicUrl });
  } catch (error) {
    try {
      await context.services.authorImages.deleteAuthorImage(uploadedImage.path);
    } catch (cleanupError) {
      console.error('[WordPressPilot] Author image cleanup failed', {
        candidateKey: image.candidateKey,
        path: uploadedImage.path,
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
      });
    }

    throw error;
  }

  updateManifestEntry(context.plan, 'author', image.candidateKey, {
    status: 'applied',
    checkpoint: 'complete',
  });
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    targetId: uploadedImage.path,
    status: 'applied',
    imageStatus: 'uploaded',
    checkpoint: 'complete',
  });
  context.result.uploadedAuthorImages += 1;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

async function applyBookCover(
  image: PilotPlan['images'][number],
  file: File,
  context: {
    plan: PilotPlan;
    result: PilotResult;
    services: PilotApplyServices;
    bookIdsByCandidateKey: Map<string, string>;
    checkpointWriter?: PilotCheckpointWriter;
  },
) {
  const bookId = context.bookIdsByCandidateKey.get(image.candidateKey);

  if (!bookId) {
    throw new Error(`No book targetId for ${image.candidateKey}`);
  }

  const uploadedCover = await context.services.bookCovers.uploadBookCover(bookId, file);
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    targetId: uploadedCover.path,
    status: 'partial',
    imageStatus: 'uploaded',
    checkpoint: 'image_uploaded',
  });
  mergeImageMetadata(context.plan, image.candidateKey, {
    sourceUrl: image.attachmentUrl,
    storagePath: uploadedCover.path,
    resultingUrl: uploadedCover.publicUrl,
    role: image.role,
  });
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);

  try {
    await context.services.books.updateBook(bookId, { coverUrl: uploadedCover.publicUrl });
  } catch (error) {
    try {
      await context.services.bookCovers.deleteBookCover(uploadedCover.publicUrl);
    } catch (cleanupError) {
      console.error('[WordPressPilot] Book cover cleanup failed', {
        candidateKey: image.candidateKey,
        publicUrl: uploadedCover.publicUrl,
        error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
      });
    }

    throw error;
  }

  updateManifestEntry(context.plan, 'book', image.candidateKey, {
    status: 'applied',
    checkpoint: 'complete',
  });
  updateManifestEntry(context.plan, 'image', image.candidateKey, {
    targetId: uploadedCover.path,
    status: 'applied',
    imageStatus: 'uploaded',
    checkpoint: 'complete',
  });
  context.result.uploadedBookCovers += 1;
  await persistCheckpoint(context.checkpointWriter, context.plan, context.result);
}

export async function applyPilotMigration(
  plan: PilotPlan,
  options: PilotApplyOptions = {},
): Promise<PilotResult> {
  const result = createInitialApplyResult(plan);
  const existingManifest = options.existingManifest ?? null;
  const authorIdsByCandidateKey = new Map<string, string>();
  const bookIdsByCandidateKey = new Map<string, string>();

  try {
    if (!options.services && !options.skipEnvironmentCheck) {
      assertPilotApplyEnvironment(process.env, {
        requireStorageCredentials: requiresStorageMigrationCredentials(plan, existingManifest),
      });
    }

    const services = options.services ?? (await getDefaultServices());

    if (options.retryImagesOnly) {
      primeTargetIdsFromManifest({
        plan,
        existingManifest,
        authorIdsByCandidateKey,
        bookIdsByCandidateKey,
      });
      await applyImages({
        plan,
        result,
        services,
        authorIdsByCandidateKey,
        bookIdsByCandidateKey,
        existingManifest,
        checkpointWriter: options.checkpointWriter,
        retryImagesOnly: true,
      });

      return result;
    }

    const existingPlanErrors = plan.issues.filter((issue) => issue.severity === 'error');
    if (existingPlanErrors.length > 0) {
      result.failed += existingPlanErrors.length;
      await persistCheckpoint(options.checkpointWriter, plan, result);
      return result;
    }

    await runPreflight(plan, result, services, existingManifest);

    if (result.issues.some((issue) => issue.severity === 'error')) {
      result.failed += result.issues.filter((issue) => issue.severity === 'error').length;
      await persistCheckpoint(options.checkpointWriter, plan, result);
      return result;
    }

    for (const author of plan.authors) {
      await applyAuthor(author, {
        plan,
        result,
        services,
        authorIdsByCandidateKey,
        existingManifest,
        checkpointWriter: options.checkpointWriter,
      });
    }

    for (const book of plan.books) {
      await applyBook(book, {
        plan,
        result,
        services,
        authorIdsByCandidateKey,
        bookIdsByCandidateKey,
        existingManifest,
        checkpointWriter: options.checkpointWriter,
      });
    }

    await applyImages({
      plan,
      result,
      services,
      authorIdsByCandidateKey,
      bookIdsByCandidateKey,
      existingManifest,
      checkpointWriter: options.checkpointWriter,
      retryImagesOnly: options.retryImagesOnly,
    });
  } catch (error) {
    addUnexpectedApplyIssue(result, error);
    await persistCheckpoint(options.checkpointWriter, plan, result);
  }

  return result;
}
