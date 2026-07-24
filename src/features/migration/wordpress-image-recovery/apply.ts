import { createHash } from 'node:crypto';

import sharp from 'sharp';

import type { UpdateAuthorInput } from '@/schemas/authors/author.schema';
import type { UpdateBookInput } from '@/schemas/books/book.schema';
import type {
  ImageRecoveryApplyManifestEntry,
  ImageRecoveryApplyOperation,
  ImageRecoveryApplyPlan,
  ImageRecoveryRollbackPlan,
  ImageRecoveryRollbackResource,
} from './apply-types';

const maxImageSizeBytes = 5 * 1024 * 1024;
const downloadTimeoutMs = 30_000;

interface ImageRecoveryAuthor {
  id: string;
  photoUrl?: string | null;
}

interface ImageRecoveryBook {
  id: string;
  coverUrl?: string | null;
}

interface ImageRecoveryStorageResult {
  path: string;
  publicUrl: string;
}

export interface DownloadedRecoveryImage {
  body: ArrayBuffer;
  mimeType: string;
  filename: string;
}

export interface ImageRecoveryApplyServices {
  authors: {
    getAuthorById(id: string): Promise<ImageRecoveryAuthor>;
    updateAuthor(id: string, input: UpdateAuthorInput): Promise<ImageRecoveryAuthor | null>;
  };
  books: {
    getBookById(id: string): Promise<ImageRecoveryBook>;
    updateBook(id: string, input: UpdateBookInput): Promise<ImageRecoveryBook | null>;
  };
  authorImages: {
    uploadAuthorImage(
      authorId: string,
      file: File,
      objectUuid?: string,
    ): Promise<ImageRecoveryStorageResult>;
    deleteAuthorImage(path: string): Promise<void>;
  };
  bookCovers: {
    uploadBookCover(
      bookId: string,
      file: File,
      objectUuid?: string,
    ): Promise<ImageRecoveryStorageResult>;
    deleteBookCover(publicUrl: string | null): Promise<void>;
  };
  downloadImage(url: string, operationKey: string): Promise<DownloadedRecoveryImage>;
}

export interface ImageRecoveryCheckpointWriter {
  persist(plan: ImageRecoveryApplyPlan): Promise<void>;
}

export interface ApplyImageRecoveryOptions {
  services?: ImageRecoveryApplyServices;
  checkpointWriter?: ImageRecoveryCheckpointWriter;
}

export async function preflightImageRecoveryApply(
  plan: ImageRecoveryApplyPlan,
  services: ImageRecoveryApplyServices,
) {
  for (const operation of plan.operations) {
    if (operation.status !== 'ready') {
      continue;
    }

    if (!operation.targetId) {
      addOperationConflict(plan, operation, 'MISSING_TARGET_ID', 'La operacion no tiene targetId.');
      continue;
    }

    try {
      if (operation.entityType === 'author_photo') {
        await services.authors.getAuthorById(operation.targetId);
      } else {
        await services.books.getBookById(operation.targetId);
      }
    } catch (error) {
      addOperationConflict(
        plan,
        operation,
        'TARGET_ENTITY_NOT_FOUND',
        'La entidad objetivo no existe en PostgreSQL.',
        error instanceof Error ? error.message : null,
      );
      continue;
    }

    if (!operation.sourceUrl) {
      addOperationConflict(
        plan,
        operation,
        'SOURCE_IMAGE_URL_MISSING',
        'La operacion no tiene URL fuente.',
      );
    }
  }

  syncResultFromPlan(plan);
}

export async function applyImageRecovery(
  plan: ImageRecoveryApplyPlan,
  options: ApplyImageRecoveryOptions = {},
) {
  if (plan.conflicts.some((conflict) => conflict.severity === 'error')) {
    throw new Error(
      `Image recovery bloqueado por conflictos: ${plan.conflicts
        .filter((conflict) => conflict.severity === 'error')
        .map((conflict) => conflict.code)
        .join(', ')}`,
    );
  }

  const services = options.services ?? (await getDefaultServices());
  const batchTracker = createBatchTracker(plan);

  for (const operation of plan.operations) {
    const entry = getManifestEntry(plan, operation.operationKey);

    if (!entry || entry.status === 'applied' || entry.status === 'skipped') {
      continue;
    }

    if (operation.status !== 'ready') {
      markEntry(entry, {
        status: operation.status,
        checkpoint:
          operation.status === 'manual_action_required' ? 'manual_action_required' : 'planned',
      });
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
      continue;
    }

    try {
      await applyOperation(plan, operation, entry, services, options.checkpointWriter);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
    } catch {
      markEntry(entry, {
        status: entry.checkpoint === 'cleanup_failed' ? 'partial' : 'failed',
        checkpoint: entry.checkpoint === 'cleanup_failed' ? 'cleanup_failed' : 'failed',
      });
      await persist(options.checkpointWriter, plan);
      await completeOperationBatch(batchTracker, options.checkpointWriter, plan);
    }
  }

  syncResultFromPlan(plan);
  await persist(options.checkpointWriter, plan);

  return plan.result;
}

async function applyOperation(
  plan: ImageRecoveryApplyPlan,
  operation: ImageRecoveryApplyOperation,
  entry: ImageRecoveryApplyManifestEntry,
  services: ImageRecoveryApplyServices,
  checkpointWriter: ImageRecoveryCheckpointWriter | undefined,
) {
  if (!operation.targetId || !operation.sourceUrl) {
    throw new Error('Missing targetId or sourceUrl.');
  }

  if (operation.entityType === 'author_photo') {
    const author = await services.authors.getAuthorById(operation.targetId);

    if (author.photoUrl && !canRepairExistingAuthorPhoto(entry, author.photoUrl)) {
      markEntry(entry, {
        status: 'skipped',
        checkpoint: 'skipped',
        previousUrl: author.photoUrl,
        sourceMetadata: {
          ...entry.sourceMetadata,
          skippedReason: 'author_already_has_photo',
        },
      });
      await persist(checkpointWriter, plan);
      return;
    }

    const uploaded = await getOrUploadImage(plan, operation, entry, services, checkpointWriter);

    try {
      await services.authors.updateAuthor(operation.targetId, {
        photoUrl: uploaded.publicUrl,
      });
    } catch (error) {
      await cleanupUploadedImage(plan, operation, entry, uploaded, services);
      throw error;
    }

    registerRollbackResource(plan.rollbackPlan, {
      entityType: 'author_photo',
      targetId: operation.targetId,
      candidateKey: operation.candidateKey,
      previousUrl: author.photoUrl ?? null,
      newUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
      bucket: 'authors',
    });
    markEntry(entry, {
      status: 'applied',
      checkpoint: 'applied',
      previousUrl: author.photoUrl ?? null,
      publicUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
    });
    await persist(checkpointWriter, plan);
    return;
  }

  const book = await services.books.getBookById(operation.targetId);

  if (book.coverUrl && entry.checkpoint !== 'uploaded_pending_db') {
    markEntry(entry, {
      status: 'skipped',
      checkpoint: 'skipped',
      previousUrl: book.coverUrl,
      sourceMetadata: {
        ...entry.sourceMetadata,
        skippedReason: 'book_already_has_cover',
      },
    });
    await persist(checkpointWriter, plan);
    return;
  }

  const uploaded = await getOrUploadImage(plan, operation, entry, services, checkpointWriter);

  try {
    await services.books.updateBook(operation.targetId, {
      coverUrl: uploaded.publicUrl,
    });
  } catch (error) {
    await cleanupUploadedImage(plan, operation, entry, uploaded, services);
    throw error;
  }

  registerRollbackResource(plan.rollbackPlan, {
    entityType: 'book_cover',
    targetId: operation.targetId,
    candidateKey: operation.candidateKey,
    previousUrl: book.coverUrl ?? null,
    newUrl: uploaded.publicUrl,
    storagePath: uploaded.path,
    bucket: 'book-covers',
  });
  markEntry(entry, {
    status: 'applied',
    checkpoint: 'applied',
    previousUrl: book.coverUrl ?? null,
    publicUrl: uploaded.publicUrl,
    storagePath: uploaded.path,
  });
  await persist(checkpointWriter, plan);
}

async function getOrUploadImage(
  plan: ImageRecoveryApplyPlan,
  operation: ImageRecoveryApplyOperation,
  entry: ImageRecoveryApplyManifestEntry,
  services: ImageRecoveryApplyServices,
  checkpointWriter: ImageRecoveryCheckpointWriter | undefined,
) {
  if (entry.checkpoint === 'uploaded_pending_db' && entry.storagePath && entry.publicUrl) {
    return {
      path: entry.storagePath,
      publicUrl: entry.publicUrl,
    };
  }

  if (!operation.sourceUrl || !operation.targetId) {
    throw new Error('Missing image source or target.');
  }

  const downloaded = await services.downloadImage(operation.sourceUrl, operation.operationKey);
  const file = await prepareImageFile(downloaded, operation);
  const objectUuid = deterministicUuid(`${operation.operationKey}:${operation.sourceUrl}`);
  const uploaded =
    operation.entityType === 'author_photo'
      ? await services.authorImages.uploadAuthorImage(operation.targetId, file, objectUuid)
      : await services.bookCovers.uploadBookCover(operation.targetId, file, objectUuid);

  markEntry(entry, {
    status: 'partial',
    checkpoint: 'uploaded_pending_db',
    storagePath: uploaded.path,
    publicUrl: uploaded.publicUrl,
    sourceMetadata: {
      ...entry.sourceMetadata,
      createdByImageRecovery: true,
      transformed: file.name.endsWith('.jpg'),
    },
  });
  await persist(checkpointWriter, plan);

  return uploaded;
}

export async function prepareImageFile(
  downloaded: DownloadedRecoveryImage,
  operation: ImageRecoveryApplyOperation,
): Promise<File> {
  const originalBuffer = Buffer.from(downloaded.body);
  const isCompatibleMime =
    downloaded.mimeType === 'image/jpeg' ||
    downloaded.mimeType === 'image/png' ||
    downloaded.mimeType === 'image/webp';
  const mustTransform =
    operation.transform.required ||
    !isCompatibleMime ||
    originalBuffer.byteLength > maxImageSizeBytes;

  if (!mustTransform) {
    return new File([originalBuffer], downloaded.filename, { type: downloaded.mimeType });
  }

  const transformedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({
      width: operation.transform.maxWidth,
      height: operation.transform.maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: operation.transform.quality,
      mozjpeg: true,
    })
    .toBuffer();

  return new File([transformedBuffer], `${operation.operationKey}.jpg`, { type: 'image/jpeg' });
}

export async function downloadRecoveryImage(
  url: string,
  operationKey: string,
): Promise<DownloadedRecoveryImage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), downloadTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.arrayBuffer();

    if (body.byteLength <= 0) {
      throw new Error('Empty image body');
    }

    return {
      body,
      mimeType: response.headers.get('content-type')?.split(';')[0]?.trim() ?? '',
      filename: `${operationKey}.${extensionFromUrlOrMime(url, response.headers.get('content-type'))}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function cleanupUploadedImage(
  plan: ImageRecoveryApplyPlan,
  operation: ImageRecoveryApplyOperation,
  entry: ImageRecoveryApplyManifestEntry,
  uploaded: ImageRecoveryStorageResult,
  services: ImageRecoveryApplyServices,
) {
  if (entry.sourceMetadata.createdByImageRecovery !== true) {
    return;
  }

  try {
    if (operation.entityType === 'author_photo') {
      await services.authorImages.deleteAuthorImage(uploaded.path);
    } else {
      await services.bookCovers.deleteBookCover(uploaded.publicUrl);
    }
  } catch {
    markEntry(entry, {
      status: 'partial',
      checkpoint: 'cleanup_failed',
    });
    plan.rollbackPlan.warnings.push(
      `Puede existir una imagen huerfana de Stage 4: ${uploaded.path}`,
    );
  }
}

async function getDefaultServices(): Promise<ImageRecoveryApplyServices> {
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
    downloadImage: downloadRecoveryImage,
  };
}

function canRepairExistingAuthorPhoto(entry: ImageRecoveryApplyManifestEntry, currentUrl: string) {
  return (
    entry.checkpoint === 'uploaded_pending_db' ||
    (entry.sourceMetadata.category === 'technical_retry' && entry.publicUrl === currentUrl)
  );
}

function registerRollbackResource(
  rollbackPlan: ImageRecoveryRollbackPlan,
  resource: ImageRecoveryRollbackResource,
) {
  const alreadyRegistered = rollbackPlan.resources.some(
    (existing) =>
      existing.entityType === resource.entityType &&
      existing.candidateKey === resource.candidateKey &&
      existing.storagePath === resource.storagePath,
  );

  if (!alreadyRegistered) {
    rollbackPlan.resources.push(resource);
  }
}

function syncResultFromPlan(plan: ImageRecoveryApplyPlan) {
  plan.rollbackPlan.orderedOperations = createOrderedRollbackOperations(plan.rollbackPlan);
  plan.result.bookCoversUploaded = plan.rollbackPlan.resources.filter(
    (resource) => resource.entityType === 'book_cover',
  ).length;
  plan.result.authorPhotosUploaded = plan.rollbackPlan.resources.filter(
    (resource) => resource.entityType === 'author_photo',
  ).length;
  plan.result.alreadyApplied = plan.manifest.entries.filter(
    (entry) => entry.status === 'applied' || entry.status === 'skipped',
  ).length;
  plan.result.technicalRetriesRecovered = plan.rollbackPlan.resources.filter((resource) => {
    const entry = getManifestEntry(plan, `author_photo:${resource.candidateKey}`);
    return entry?.sourceMetadata.category === 'technical_retry';
  }).length;
  plan.result.partial = plan.manifest.entries.filter((entry) => entry.status === 'partial').length;
  plan.result.failed = plan.manifest.entries.filter((entry) => entry.status === 'failed').length;
}

function createOrderedRollbackOperations(rollbackPlan: ImageRecoveryRollbackPlan) {
  return [
    ...rollbackPlan.resources.map((resource) => ({
      action: 'restore_db_url' as const,
      entityType: resource.entityType,
      targetId: resource.targetId,
      previousUrl: resource.previousUrl,
      candidateKey: resource.candidateKey,
    })),
    ...rollbackPlan.resources.map((resource) => ({
      action: 'delete_storage_path' as const,
      bucket: resource.bucket,
      path: resource.storagePath,
      candidateKey: resource.candidateKey,
    })),
  ];
}

function addOperationConflict(
  plan: ImageRecoveryApplyPlan,
  operation: ImageRecoveryApplyOperation,
  code: string,
  message: string,
  details: string | null = null,
) {
  plan.conflicts.push({
    severity: 'error',
    code,
    entityType: operation.entityType,
    candidateKey: operation.candidateKey,
    message,
    details,
  });
  operation.status = 'blocked';
  operation.blockerCodes.push(code);
}

function getManifestEntry(plan: ImageRecoveryApplyPlan, operationKey: string) {
  return plan.manifest.entries.find((entry) => entry.operationKey === operationKey);
}

function markEntry(
  entry: ImageRecoveryApplyManifestEntry,
  updates: Partial<ImageRecoveryApplyManifestEntry>,
) {
  Object.assign(entry, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

async function persist(
  writer: ImageRecoveryCheckpointWriter | undefined,
  plan: ImageRecoveryApplyPlan,
) {
  if (!writer) {
    return;
  }

  syncResultFromPlan(plan);
  await writer.persist(plan);
}

interface BatchTracker {
  processedOperations: number;
  batchSize: number;
}

function createBatchTracker(plan: ImageRecoveryApplyPlan): BatchTracker {
  return {
    processedOperations: plan.manifest.completedBatches.length * plan.batchSize,
    batchSize: Math.max(1, Math.trunc(plan.batchSize)),
  };
}

async function completeOperationBatch(
  tracker: BatchTracker,
  writer: ImageRecoveryCheckpointWriter | undefined,
  plan: ImageRecoveryApplyPlan,
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

function extensionFromUrlOrMime(url: string, contentType: string | null) {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('.png')) {
    return 'png';
  }

  if (lowerUrl.includes('.webp')) {
    return 'webp';
  }

  if (contentType?.includes('png')) {
    return 'png';
  }

  if (contentType?.includes('webp')) {
    return 'webp';
  }

  return 'jpg';
}

function deterministicUuid(value: string) {
  const hash = createHash('sha256').update(value).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
