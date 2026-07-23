import { createHash } from 'node:crypto';

import type { CreateAuthorInput, UpdateAuthorInput } from '@/schemas/authors/author.schema';
import type {
  BookEditionInput,
  CreateBookInput,
  UpdateBookInput,
} from '@/schemas/books/book.schema';
import { downloadImage } from '@/features/migration/wordpress-pilot/apply';
import type { MassApplyConflict, MassApplyPlan, MassApplyResult } from './types';

interface MassApplyAuthor {
  id: string;
  slug: string;
  photoUrl?: string | null;
}

interface MassApplyBook {
  id: string;
  slug: string;
  coverUrl?: string | null;
  authors: { id: string; sortOrder: number }[];
  editions: MassApplyBookEdition[];
}

interface MassApplyBookEdition {
  id: string;
  format: string;
  editionLabel: string | null;
  publicationDate: string | null;
  isbn10: string | null;
  isbn13: string | null;
  price: string | null;
  currency: string;
  pages: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

interface MassApplyImageResult {
  path: string;
  publicUrl: string;
}

interface DownloadedImage {
  file: File;
}

export interface MassApplyServices {
  authors: {
    getAuthorById(id: string): Promise<MassApplyAuthor>;
    createAuthor(input: CreateAuthorInput): Promise<MassApplyAuthor>;
    updateAuthor(id: string, input: UpdateAuthorInput): Promise<MassApplyAuthor | null>;
  };
  books: {
    getBookById(id: string): Promise<MassApplyBook>;
    createBook(input: CreateBookInput): Promise<MassApplyBook>;
    updateBook(id: string, input: UpdateBookInput): Promise<MassApplyBook | null>;
  };
  authorImages: {
    uploadAuthorImage(
      authorId: string,
      file: File,
      objectUuid?: string,
    ): Promise<MassApplyImageResult>;
    deleteAuthorImage(path: string): Promise<void>;
  };
  bookCovers: {
    uploadBookCover(bookId: string, file: File, objectUuid?: string): Promise<MassApplyImageResult>;
    deleteBookCover(publicUrl: string | null): Promise<void>;
  };
  downloadImage(url: string, candidateKey: string): Promise<DownloadedImage>;
}

export interface MassApplyCheckpointWriter {
  persist(plan: MassApplyPlan): Promise<void>;
}

export interface ApplyMassMigrationOptions {
  services?: MassApplyServices;
  checkpointWriter?: MassApplyCheckpointWriter;
  batchSize?: number;
}

export async function applyMassMigration(
  plan: MassApplyPlan,
  options: ApplyMassMigrationOptions = {},
): Promise<MassApplyResult> {
  const services = options.services ?? (await getDefaultServices());
  const result = createApplyResult(plan);
  plan.result = result;
  const authorIdsByCandidateKey = primeTargetIds(plan, 'author');
  const bookIdsByCandidateKey = primeTargetIds(plan, 'book');
  const batchTracker = createBatchTracker(plan, options.batchSize ?? plan.batchSize);

  assertApplyCanStart(plan);

  for (const author of plan.authors) {
    const entry = getManifestEntry(plan, 'author', author.candidateKey);

    if (author.action === 'REUSE_PILOT' && author.pilotTargetId) {
      const verifiedAuthor = await verifyPilotAuthor(plan, services, author);

      if (!verifiedAuthor) {
        await persist(options.checkpointWriter, plan);
        await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
        continue;
      }

      authorIdsByCandidateKey.set(author.candidateKey, author.pilotTargetId);
      markEntry(entry, {
        targetId: author.pilotTargetId,
        status: 'applied',
        checkpoint: 'pilot_reconciled',
      });
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    if (entry?.status === 'applied' && entry.targetId) {
      authorIdsByCandidateKey.set(author.candidateKey, entry.targetId);
      continue;
    }

    if (author.action !== 'CREATE') {
      markEntry(entry, { status: 'skipped', checkpoint: 'skipped' });
      result.skipped += 1;
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    try {
      const createdAuthor = await services.authors.createAuthor(author.input);
      authorIdsByCandidateKey.set(author.candidateKey, createdAuthor.id);
      markEntry(entry, {
        targetId: createdAuthor.id,
        status: 'applied',
        checkpoint: 'author_created',
      });
      result.authorsCreated += 1;
      plan.rollbackPlan.resources.authors.push({
        id: createdAuthor.id,
        candidateKey: author.candidateKey,
        preexisting: false,
      });
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
    } catch (error) {
      markEntry(entry, { status: 'failed', checkpoint: 'planned' });
      result.failed += 1;
      await persist(options.checkpointWriter, plan);
      throw error;
    }
  }

  for (const book of plan.books) {
    const entry = getManifestEntry(plan, 'book', book.candidateKey);

    if (book.action === 'REUSE_PILOT' && book.pilotTargetId) {
      const reconciledBook = await reconcilePilotBook(
        plan,
        services,
        book,
        authorIdsByCandidateKey,
      );

      if (!reconciledBook) {
        await persist(options.checkpointWriter, plan);
        await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
        continue;
      }

      bookIdsByCandidateKey.set(book.candidateKey, book.pilotTargetId);
      markEntry(entry, {
        targetId: book.pilotTargetId,
        status: 'applied',
        checkpoint: 'pilot_reconciled',
      });
      markReusedBookDependencies(plan, book.candidateKey, book.pilotTargetId, reconciledBook);
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    if (entry?.status === 'applied' && entry.targetId) {
      bookIdsByCandidateKey.set(book.candidateKey, entry.targetId);
      continue;
    }

    if (book.action !== 'CREATE') {
      markEntry(entry, { status: 'skipped', checkpoint: 'skipped' });
      result.skipped += 1;
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    const authorIds = resolveBookAuthorIds(book.authorCandidateKeys, authorIdsByCandidateKey);

    if (!authorIds) {
      markEntry(entry, { status: 'failed', checkpoint: 'planned' });
      result.failed += 1;
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    try {
      const createdBook = await services.books.createBook({
        ...book.input,
        authorIds,
      });
      bookIdsByCandidateKey.set(book.candidateKey, createdBook.id);
      markEntry(entry, {
        targetId: createdBook.id,
        status: 'applied',
        checkpoint: 'book_created',
      });
      result.booksCreated += 1;
      plan.rollbackPlan.resources.books.push({
        id: createdBook.id,
        candidateKey: book.candidateKey,
        preexisting: false,
      });
      markCreatedBookDependencies(
        plan,
        book.candidateKey,
        createdBook.id,
        authorIds,
        createdBook.editions,
      );
      result.relationsCreated += authorIds.length;
      result.editionsCreated += book.input.editions.length;
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
    } catch (error) {
      markEntry(entry, { status: 'failed', checkpoint: 'planned' });
      result.failed += 1;
      await persist(options.checkpointWriter, plan);
      throw error;
    }
  }

  await applyImages({
    plan,
    result,
    services,
    authorIdsByCandidateKey,
    bookIdsByCandidateKey,
    checkpointWriter: options.checkpointWriter,
    batchTracker,
  });

  syncResultFromPlan(plan);
  await persist(options.checkpointWriter, plan);

  return result;
}

async function getDefaultServices(): Promise<MassApplyServices> {
  const authorService = await import('@/services/authors/author.service');
  const bookService = await import('@/services/books/book.service');
  const { createPilotMigrationStorageServices } =
    await import('@/features/migration/wordpress-pilot/storage-services');
  const storageServices = createPilotMigrationStorageServices();

  return {
    authors: authorService,
    books: bookService,
    authorImages: {
      async uploadAuthorImage(authorId, file, objectUuid) {
        if (!objectUuid) {
          return storageServices.authorImages.uploadAuthorImage(authorId, file);
        }

        const { createSupabaseMigrationClient } =
          await import('@/features/migration/wordpress-pilot/supabase-migration-client');
        const { createAuthorImageService } =
          await import('@/features/admin/authors/services/author-image-service.core');
        const service = createAuthorImageService(createSupabaseMigrationClient().storage, {
          randomUUID: () => objectUuid,
        });

        return service.uploadAuthorImage(authorId, file);
      },
      deleteAuthorImage: storageServices.authorImages.deleteAuthorImage,
    },
    bookCovers: {
      async uploadBookCover(bookId, file, objectUuid) {
        if (!objectUuid) {
          return storageServices.bookCovers.uploadBookCover(bookId, file);
        }

        const { createSupabaseMigrationClient } =
          await import('@/features/migration/wordpress-pilot/supabase-migration-client');
        const { createBookCoverService } =
          await import('@/features/admin/books/services/book-cover-service.core');
        const service = createBookCoverService(createSupabaseMigrationClient().storage, {
          randomUUID: () => objectUuid,
        });

        return service.uploadBookCover(bookId, file);
      },
      deleteBookCover: storageServices.bookCovers.deleteBookCover,
    },
    downloadImage,
  };
}

function createApplyResult(plan: MassApplyPlan): MassApplyResult {
  return {
    generatedAt: new Date().toISOString(),
    authorsCreated: 0,
    authorsReusedFromPilot: plan.authors.filter((author) => author.action === 'REUSE_PILOT').length,
    booksCreated: 0,
    booksReusedFromPilot: plan.books.filter((book) => book.action === 'REUSE_PILOT').length,
    editionsCreated: 0,
    relationsCreated: 0,
    relationsRepaired: 0,
    authorImagesUploaded: 0,
    bookCoversUploaded: 0,
    editionsRepaired: 0,
    skipped: 0,
    manualActionRequired: 0,
    partial: 0,
    failed: 0,
  };
}

function assertApplyCanStart(plan: MassApplyPlan) {
  const blockingConflicts = plan.conflicts.filter(
    (conflict) => conflict.severity === 'error' && conflict.code !== 'BACKUP_REQUIRED_BEFORE_APPLY',
  );

  if (blockingConflicts.length > 0) {
    throw new Error(
      `Apply bloqueado por conflictos: ${blockingConflicts.map((conflict) => conflict.code).join(', ')}`,
    );
  }
}

function primeTargetIds(plan: MassApplyPlan, entityType: 'author' | 'book') {
  const idsByCandidateKey = new Map<string, string>();

  for (const entry of plan.manifest.entries) {
    if (entry.entityType === entityType && entry.targetId && entry.status === 'applied') {
      idsByCandidateKey.set(entry.candidateKey, entry.targetId);
    }
  }

  return idsByCandidateKey;
}

function resolveBookAuthorIds(
  authorCandidateKeys: string[],
  authorIdsByCandidateKey: Map<string, string>,
) {
  const authorIds = authorCandidateKeys
    .map((candidateKey) => authorIdsByCandidateKey.get(candidateKey))
    .filter((authorId): authorId is string => Boolean(authorId));

  return authorIds.length === authorCandidateKeys.length ? authorIds : null;
}

async function verifyPilotAuthor(
  plan: MassApplyPlan,
  services: MassApplyServices,
  author: MassApplyPlan['authors'][number],
) {
  if (!author.pilotTargetId) {
    addConflict(plan, {
      code: 'PILOT_AUTHOR_NOT_FOUND',
      entityType: 'author',
      candidateKey: author.candidateKey,
      message: 'El autor del piloto no tiene targetId.',
      details: author.resolvedSlug,
    });
    markEntry(getManifestEntry(plan, 'author', author.candidateKey), {
      status: 'failed',
      checkpoint: 'planned',
    });
    return null;
  }

  try {
    const currentAuthor = await services.authors.getAuthorById(author.pilotTargetId);

    if (currentAuthor.slug !== author.input.slug) {
      addConflict(plan, {
        code: 'PILOT_ENTITY_MISMATCH',
        entityType: 'author',
        candidateKey: author.candidateKey,
        message: 'El slug del autor reutilizado del piloto no coincide con el plan masivo.',
        details: `expected=${author.input.slug} actual=${currentAuthor.slug}`,
      });
      markEntry(getManifestEntry(plan, 'author', author.candidateKey), {
        status: 'failed',
        checkpoint: 'planned',
      });
      return null;
    }

    return currentAuthor;
  } catch (error) {
    addConflict(plan, {
      code: 'PILOT_AUTHOR_NOT_FOUND',
      entityType: 'author',
      candidateKey: author.candidateKey,
      message: 'No existe en DB el autor reutilizado desde el piloto.',
      details: error instanceof Error ? error.message : author.pilotTargetId,
    });
    markEntry(getManifestEntry(plan, 'author', author.candidateKey), {
      status: 'failed',
      checkpoint: 'planned',
    });
    return null;
  }
}

async function reconcilePilotBook(
  plan: MassApplyPlan,
  services: MassApplyServices,
  book: MassApplyPlan['books'][number],
  authorIdsByCandidateKey: Map<string, string>,
) {
  if (!book.pilotTargetId) {
    addConflict(plan, {
      code: 'PILOT_BOOK_NOT_FOUND',
      entityType: 'book',
      candidateKey: book.candidateKey,
      message: 'El libro del piloto no tiene targetId.',
      details: book.input.slug,
    });
    markEntry(getManifestEntry(plan, 'book', book.candidateKey), {
      status: 'failed',
      checkpoint: 'planned',
    });
    return null;
  }

  const expectedAuthorIds = resolveBookAuthorIds(book.authorCandidateKeys, authorIdsByCandidateKey);

  if (!expectedAuthorIds) {
    addConflict(plan, {
      code: 'MISSING_DEPENDENCY',
      entityType: 'book',
      candidateKey: book.candidateKey,
      message: 'No se pudieron resolver todos los autores esperados para el libro del piloto.',
      details: book.authorCandidateKeys.join(', '),
    });
    markEntry(getManifestEntry(plan, 'book', book.candidateKey), {
      status: 'failed',
      checkpoint: 'planned',
    });
    return null;
  }

  try {
    const currentBook = await services.books.getBookById(book.pilotTargetId);

    if (currentBook.slug !== book.input.slug) {
      addConflict(plan, {
        code: 'PILOT_ENTITY_MISMATCH',
        entityType: 'book',
        candidateKey: book.candidateKey,
        message: 'El slug del libro reutilizado del piloto no coincide con el plan masivo.',
        details: `expected=${book.input.slug} actual=${currentBook.slug}`,
      });
      markEntry(getManifestEntry(plan, 'book', book.candidateKey), {
        status: 'failed',
        checkpoint: 'planned',
      });
      return null;
    }

    const currentAuthorIds = currentBook.authors
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((author) => author.id);
    const missingAuthorIds = expectedAuthorIds.filter(
      (authorId) => !currentAuthorIds.includes(authorId),
    );
    const hasEditions = currentBook.editions.length > 0;

    if (missingAuthorIds.length === 0 && hasEditions) {
      return { book: currentBook, repairedRelations: 0, repairedEditions: 0 };
    }

    const mergedAuthorIds = [...currentAuthorIds, ...missingAuthorIds];
    const editions = hasEditions
      ? currentBook.editions.map(toBookEditionInput)
      : book.input.editions;
    const repairedBook = await services.books.updateBook(book.pilotTargetId, {
      authorIds: mergedAuthorIds,
      editions,
    });

    if (!repairedBook) {
      throw new Error('Book update did not return a record.');
    }

    return {
      book: repairedBook,
      repairedRelations: missingAuthorIds.length,
      repairedEditions: hasEditions ? 0 : editions.length,
    };
  } catch (error) {
    addConflict(plan, {
      code: 'PILOT_BOOK_RECONCILIATION_FAILED',
      entityType: 'book',
      candidateKey: book.candidateKey,
      message: 'No se pudo verificar o reparar el libro reutilizado del piloto.',
      details: error instanceof Error ? error.message : book.pilotTargetId,
    });
    markEntry(getManifestEntry(plan, 'book', book.candidateKey), {
      status: 'failed',
      checkpoint: 'planned',
    });
    return null;
  }
}

function toBookEditionInput(edition: MassApplyBookEdition): BookEditionInput {
  return {
    id: edition.id,
    format: toBookEditionFormat(edition.format),
    editionLabel: edition.editionLabel,
    publicationDate: edition.publicationDate,
    isbn10: edition.isbn10,
    isbn13: edition.isbn13,
    price: edition.price,
    currency: toBookEditionCurrency(edition.currency),
    pages: edition.pages,
    isAvailable: edition.isAvailable,
    isFeatured: edition.isFeatured,
    sortOrder: edition.sortOrder,
  };
}

function toBookEditionFormat(value: string): BookEditionInput['format'] {
  return value === 'hardcover' || value === 'ebook' || value === 'audiobook' ? value : 'paperback';
}

function toBookEditionCurrency(value: string): BookEditionInput['currency'] {
  return value === 'USD' || value === 'GBP' ? value : 'EUR';
}

function markCreatedBookDependencies(
  plan: MassApplyPlan,
  bookCandidateKey: string,
  bookId: string,
  authorIds: string[],
  editions: { id: string }[],
) {
  const relationEntries = plan.manifest.entries.filter(
    (entry) =>
      entry.entityType === 'relation' && entry.candidateKey.startsWith(`${bookCandidateKey}::`),
  );

  relationEntries.forEach((entry, index) => {
    markEntry(entry, {
      targetId: bookId,
      status: 'applied',
      checkpoint: 'relation_created',
      sourceMetadata: {
        ...entry.sourceMetadata,
        authorId: authorIds[index] ?? null,
      },
    });

    if (authorIds[index]) {
      plan.rollbackPlan.resources.relations.push({
        bookId,
        authorId: authorIds[index],
        candidateKey: entry.candidateKey,
        preexisting: false,
      });
    }
  });

  const editionEntry = getManifestEntry(plan, 'edition', bookCandidateKey);
  const editionId = editions[0]?.id ?? bookId;
  markEntry(editionEntry, {
    targetId: editionId,
    status: 'applied',
    checkpoint: 'edition_created',
  });
  plan.rollbackPlan.resources.editions.push({
    id: editionId,
    candidateKey: bookCandidateKey,
    preexisting: false,
  });
}

function markReusedBookDependencies(
  plan: MassApplyPlan,
  bookCandidateKey: string,
  bookId: string,
  reconciliation: {
    book: MassApplyBook;
    repairedRelations: number;
    repairedEditions: number;
  },
) {
  const relationEntries = plan.manifest.entries.filter(
    (entry) =>
      entry.entityType === 'relation' && entry.candidateKey.startsWith(`${bookCandidateKey}::`),
  );

  for (const entry of relationEntries) {
    markEntry(entry, {
      targetId: bookId,
      status: 'applied',
      checkpoint: reconciliation.repairedRelations > 0 ? 'relation_repaired' : 'pilot_reconciled',
    });
  }

  markEntry(getManifestEntry(plan, 'edition', bookCandidateKey), {
    targetId: reconciliation.book.editions[0]?.id ?? bookId,
    status: 'applied',
    checkpoint: reconciliation.repairedEditions > 0 ? 'edition_repaired' : 'pilot_reconciled',
  });
  plan.result.relationsRepaired += reconciliation.repairedRelations;
  plan.result.editionsRepaired += reconciliation.repairedEditions;
}

async function applyImages(context: {
  plan: MassApplyPlan;
  result: MassApplyResult;
  services: MassApplyServices;
  authorIdsByCandidateKey: Map<string, string>;
  bookIdsByCandidateKey: Map<string, string>;
  checkpointWriter?: MassApplyCheckpointWriter;
  batchTracker: MassApplyBatchTracker;
}) {
  for (const image of context.plan.authorImages) {
    const entry = getManifestEntry(context.plan, 'author_image', image.candidateKey);

    if (entry?.status === 'applied') {
      continue;
    }

    if (image.action !== 'UPLOAD' || !image.url) {
      markEntry(entry, {
        status: image.action === 'MANUAL_REVIEW' ? 'manual_action_required' : 'skipped',
        checkpoint: image.action === 'MANUAL_REVIEW' ? 'manual_action_required' : 'skipped',
      });
      context.result.manualActionRequired += image.action === 'MANUAL_REVIEW' ? 1 : 0;
      context.result.skipped += image.action === 'SKIP' ? 1 : 0;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
      continue;
    }

    const authorId = context.authorIdsByCandidateKey.get(image.candidateKey);

    if (!authorId) {
      markEntry(entry, { status: 'failed', checkpoint: 'planned' });
      context.result.failed += 1;
      await persist(context.checkpointWriter, context.plan);
      continue;
    }

    try {
      const uploadedImage = await getOrUploadAuthorImage(context, authorId, image);

      try {
        await context.services.authors.updateAuthor(authorId, {
          photoUrl: uploadedImage.publicUrl,
        });
      } catch (error) {
        await cleanupUploadedAuthorImage(context, uploadedImage.path, image.candidateKey);
        throw error;
      }

      markEntry(entry, {
        targetId: authorId,
        status: 'applied',
        checkpoint: 'author_image_uploaded',
        sourceMetadata: {
          ...entry?.sourceMetadata,
          path: uploadedImage.path,
          publicUrl: uploadedImage.publicUrl,
        },
      });
      context.result.authorImagesUploaded += 1;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
    } catch {
      markEntry(entry, {
        status: 'partial',
        checkpoint:
          entry?.checkpoint === 'cleanup_failed' ? 'cleanup_failed' : 'manual_action_required',
      });
      context.result.partial += 1;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
    }
  }

  for (const image of context.plan.bookCovers) {
    const entry = getManifestEntry(context.plan, 'book_cover', image.candidateKey);

    if (entry?.status === 'applied') {
      continue;
    }

    if (image.action !== 'UPLOAD' || !image.url) {
      markEntry(entry, {
        status: image.action === 'MANUAL_REVIEW' ? 'manual_action_required' : 'skipped',
        checkpoint: image.action === 'MANUAL_REVIEW' ? 'manual_action_required' : 'skipped',
      });
      context.result.manualActionRequired += image.action === 'MANUAL_REVIEW' ? 1 : 0;
      context.result.skipped += image.action === 'SKIP' ? 1 : 0;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
      continue;
    }

    const bookId = context.bookIdsByCandidateKey.get(image.candidateKey);

    if (!bookId) {
      markEntry(entry, { status: 'failed', checkpoint: 'planned' });
      context.result.failed += 1;
      await persist(context.checkpointWriter, context.plan);
      continue;
    }

    try {
      const uploadedCover = await getOrUploadBookCover(context, bookId, image);

      try {
        await context.services.books.updateBook(bookId, { coverUrl: uploadedCover.publicUrl });
      } catch (error) {
        await cleanupUploadedBookCover(context, uploadedCover, image.candidateKey);
        throw error;
      }

      markEntry(entry, {
        targetId: bookId,
        status: 'applied',
        checkpoint: 'book_cover_uploaded',
        sourceMetadata: {
          ...entry?.sourceMetadata,
          path: uploadedCover.path,
          publicUrl: uploadedCover.publicUrl,
        },
      });
      context.result.bookCoversUploaded += 1;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
    } catch {
      markEntry(entry, {
        status: 'partial',
        checkpoint:
          entry?.checkpoint === 'cleanup_failed' ? 'cleanup_failed' : 'manual_action_required',
      });
      context.result.partial += 1;
      await persist(context.checkpointWriter, context.plan);
      await completeOperationBatch(context.batchTracker, context.checkpointWriter, context.plan);
    }
  }
}

async function getOrUploadAuthorImage(
  context: {
    plan: MassApplyPlan;
    services: MassApplyServices;
    checkpointWriter?: MassApplyCheckpointWriter;
  },
  authorId: string,
  image: MassApplyPlan['authorImages'][number],
) {
  const entry = getManifestEntry(context.plan, 'author_image', image.candidateKey);
  const pendingPath = getStringMetadata(entry?.sourceMetadata, 'path');
  const pendingPublicUrl = getStringMetadata(entry?.sourceMetadata, 'publicUrl');

  if (entry?.checkpoint === 'uploaded_pending_db' && pendingPath && pendingPublicUrl) {
    return { path: pendingPath, publicUrl: pendingPublicUrl };
  }

  const { file } = await context.services.downloadImage(image.url ?? '', image.candidateKey);
  const objectUuid = deterministicUuid(`author_image:${authorId}:${image.candidateKey}`);
  const uploadedImage = await context.services.authorImages.uploadAuthorImage(
    authorId,
    file,
    objectUuid,
  );
  context.plan.rollbackPlan.resources.storagePaths.push({
    path: uploadedImage.path,
    bucket: 'authors',
    candidateKey: image.candidateKey,
    preexisting: false,
  });
  markEntry(entry, {
    targetId: authorId,
    status: 'partial',
    checkpoint: 'uploaded_pending_db',
    sourceMetadata: {
      ...entry?.sourceMetadata,
      path: uploadedImage.path,
      publicUrl: uploadedImage.publicUrl,
      createdByMassMigration: true,
    },
  });
  await persist(context.checkpointWriter, context.plan);

  return uploadedImage;
}

async function getOrUploadBookCover(
  context: {
    plan: MassApplyPlan;
    services: MassApplyServices;
    checkpointWriter?: MassApplyCheckpointWriter;
  },
  bookId: string,
  image: MassApplyPlan['bookCovers'][number],
) {
  const entry = getManifestEntry(context.plan, 'book_cover', image.candidateKey);
  const pendingPath = getStringMetadata(entry?.sourceMetadata, 'path');
  const pendingPublicUrl = getStringMetadata(entry?.sourceMetadata, 'publicUrl');

  if (entry?.checkpoint === 'uploaded_pending_db' && pendingPath && pendingPublicUrl) {
    return { path: pendingPath, publicUrl: pendingPublicUrl };
  }

  const { file } = await context.services.downloadImage(image.url ?? '', image.candidateKey);
  const objectUuid = deterministicUuid(`book_cover:${bookId}:${image.candidateKey}`);
  const uploadedCover = await context.services.bookCovers.uploadBookCover(bookId, file, objectUuid);
  context.plan.rollbackPlan.resources.storagePaths.push({
    path: uploadedCover.path,
    bucket: 'book-covers',
    candidateKey: image.candidateKey,
    preexisting: false,
  });
  markEntry(entry, {
    targetId: bookId,
    status: 'partial',
    checkpoint: 'uploaded_pending_db',
    sourceMetadata: {
      ...entry?.sourceMetadata,
      path: uploadedCover.path,
      publicUrl: uploadedCover.publicUrl,
      createdByMassMigration: true,
    },
  });
  await persist(context.checkpointWriter, context.plan);

  return uploadedCover;
}

async function cleanupUploadedAuthorImage(
  context: {
    plan: MassApplyPlan;
    services: MassApplyServices;
  },
  path: string,
  candidateKey: string,
) {
  const entry = getManifestEntry(context.plan, 'author_image', candidateKey);

  if (entry?.sourceMetadata.createdByMassMigration !== true) {
    return;
  }

  try {
    await context.services.authorImages.deleteAuthorImage(path);
    removeRollbackStoragePath(context.plan, 'authors', path, candidateKey);
  } catch {
    markEntry(entry, { status: 'partial', checkpoint: 'cleanup_failed' });
    context.plan.rollbackPlan.warnings.push(
      `Puede existir una foto de autor huerfana tras fallo de persistencia: ${path}`,
    );
  }
}

async function cleanupUploadedBookCover(
  context: {
    plan: MassApplyPlan;
    services: MassApplyServices;
  },
  uploadedCover: MassApplyImageResult,
  candidateKey: string,
) {
  const entry = getManifestEntry(context.plan, 'book_cover', candidateKey);

  if (entry?.sourceMetadata.createdByMassMigration !== true) {
    return;
  }

  try {
    await context.services.bookCovers.deleteBookCover(uploadedCover.publicUrl);
    removeRollbackStoragePath(context.plan, 'book-covers', uploadedCover.path, candidateKey);
  } catch {
    markEntry(entry, { status: 'partial', checkpoint: 'cleanup_failed' });
    context.plan.rollbackPlan.warnings.push(
      `Puede existir una portada huerfana tras fallo de persistencia: ${uploadedCover.path}`,
    );
  }
}

function removeRollbackStoragePath(
  plan: MassApplyPlan,
  bucket: string,
  path: string,
  candidateKey: string,
) {
  plan.rollbackPlan.resources.storagePaths = plan.rollbackPlan.resources.storagePaths.filter(
    (resource) =>
      resource.bucket !== bucket ||
      resource.path !== path ||
      resource.candidateKey !== candidateKey,
  );
}

function getManifestEntry(
  plan: MassApplyPlan,
  entityType: MassApplyPlan['manifest']['entries'][number]['entityType'],
  candidateKey: string,
) {
  return plan.manifest.entries.find(
    (entry) => entry.entityType === entityType && entry.candidateKey === candidateKey,
  );
}

function getStringMetadata(
  metadata: Record<string, string | boolean | null> | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function markEntry(
  entry: MassApplyPlan['manifest']['entries'][number] | undefined,
  updates: Partial<MassApplyPlan['manifest']['entries'][number]>,
) {
  if (!entry) {
    return;
  }

  Object.assign(entry, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

async function persist(writer: MassApplyCheckpointWriter | undefined, plan: MassApplyPlan) {
  if (!writer) {
    return;
  }

  syncResultFromPlan(plan);
  await writer.persist(plan);
}

function syncResultFromPlan(plan: MassApplyPlan) {
  plan.rollbackPlan.orderedOperations = createOrderedRollbackOperations(plan);
  plan.result.authorsCreated = plan.rollbackPlan.resources.authors.filter(
    (resource) => !resource.preexisting,
  ).length;
  plan.result.booksCreated = plan.rollbackPlan.resources.books.filter(
    (resource) => !resource.preexisting,
  ).length;
  plan.result.editionsCreated = plan.rollbackPlan.resources.editions.filter(
    (resource) => !resource.preexisting,
  ).length;
  plan.result.relationsCreated = plan.rollbackPlan.resources.relations.filter(
    (resource) => !resource.preexisting,
  ).length;
  plan.result.relationsRepaired = plan.manifest.entries.filter(
    (entry) => entry.entityType === 'relation' && entry.checkpoint === 'relation_repaired',
  ).length;
  plan.result.authorImagesUploaded = plan.rollbackPlan.resources.storagePaths.filter(
    (resource) => !resource.preexisting && resource.bucket === 'authors',
  ).length;
  plan.result.bookCoversUploaded = plan.rollbackPlan.resources.storagePaths.filter(
    (resource) => !resource.preexisting && resource.bucket === 'book-covers',
  ).length;
  plan.result.editionsRepaired = plan.manifest.entries.filter(
    (entry) => entry.entityType === 'edition' && entry.checkpoint === 'edition_repaired',
  ).length;
  plan.result.skipped = plan.manifest.entries.filter((entry) => entry.status === 'skipped').length;
  plan.result.manualActionRequired = plan.manifest.entries.filter(
    (entry) => entry.status === 'manual_action_required',
  ).length;
  plan.result.partial = plan.manifest.entries.filter((entry) => entry.status === 'partial').length;
  plan.result.failed = plan.manifest.entries.filter((entry) => entry.status === 'failed').length;
}

function createOrderedRollbackOperations(plan: MassApplyPlan) {
  return [
    ...plan.rollbackPlan.resources.storagePaths
      .filter((resource) => !resource.preexisting)
      .map((resource) => ({
        action: 'delete_storage_path' as const,
        bucket: resource.bucket,
        path: resource.path,
        candidateKey: resource.candidateKey,
      })),
    ...plan.rollbackPlan.resources.relations
      .filter((resource) => !resource.preexisting)
      .map((resource) => ({
        action: 'delete_book_relation' as const,
        bookId: resource.bookId,
        authorId: resource.authorId,
        candidateKey: resource.candidateKey,
      })),
    ...plan.rollbackPlan.resources.editions
      .filter((resource) => !resource.preexisting)
      .map((resource) => ({
        action: 'delete_book_edition' as const,
        id: resource.id,
        candidateKey: resource.candidateKey,
      })),
    ...plan.rollbackPlan.resources.books
      .filter((resource) => !resource.preexisting)
      .map((resource) => ({
        action: 'delete_book' as const,
        id: resource.id,
        candidateKey: resource.candidateKey,
      })),
    ...plan.rollbackPlan.resources.authors
      .filter((resource) => !resource.preexisting)
      .map((resource) => ({
        action: 'delete_author' as const,
        id: resource.id,
        candidateKey: resource.candidateKey,
      })),
  ];
}

function addConflict(plan: MassApplyPlan, conflict: Omit<MassApplyConflict, 'severity'>) {
  plan.conflicts.push({
    ...conflict,
    severity: 'error',
  });
  plan.summary.blockers = plan.conflicts.filter((item) => item.severity === 'error').length;
  plan.result.failed += 1;
}

interface MassApplyBatchTracker {
  processedOperations: number;
  batchSize: number;
}

function createBatchTracker(plan: MassApplyPlan, batchSize: number): MassApplyBatchTracker {
  return {
    processedOperations: plan.manifest.completedBatches.length * batchSize,
    batchSize: Math.max(1, Math.trunc(batchSize)),
  };
}

async function completeOperationBatch(
  tracker: MassApplyBatchTracker,
  writer: MassApplyCheckpointWriter | undefined,
  plan: MassApplyPlan,
) {
  tracker.processedOperations += 1;
  const batchIndex = Math.ceil(tracker.processedOperations / tracker.batchSize);
  plan.manifest.currentBatchIndex = batchIndex;

  if (tracker.processedOperations % tracker.batchSize === 0) {
    if (!plan.manifest.completedBatches.includes(batchIndex)) {
      plan.manifest.completedBatches.push(batchIndex);
    }

    await persist(writer, plan);
  }
}

function deterministicUuid(value: string) {
  const hash = createHash('sha256').update(value).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
