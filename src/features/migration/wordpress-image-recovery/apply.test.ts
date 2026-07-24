import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

import {
  applyImageRecovery,
  prepareImageFile,
  type DownloadedRecoveryImage,
  type ImageRecoveryApplyServices,
} from './apply';
import { buildImageRecoveryApplyPlan } from './apply-plan';
import type { ImageRecoveryApplyOperation, ImageRecoveryApplyPlan } from './apply-types';

const authorId = 'author-id';
const bookId = 'book-id';

describe('image recovery apply stage', () => {
  it('plans approved covers from the original algorithm suggestion', async () => {
    const fixture = await createFixture({
      decisions: [
        createDecision({
          candidateKey: 'book:one',
          selectedGroupKey: 'attachment:1',
          algorithmGroupKey: 'attachment:1',
          selectionSource: 'algorithm',
        }),
      ],
    });

    const plan = await buildImageRecoveryApplyPlan({
      massDirectory: fixture.massDirectory,
      auditDirectory: fixture.auditDirectory,
      mode: 'dry-run',
      batchSize: 10,
      resume: false,
    });

    expect(plan.result.bookCovers).toMatchObject({
      approvedTotal: 1,
      algorithmSelections: 1,
      editorialManualSelections: 0,
      readyToApply: 1,
    });
    expect(plan.operations[0]).toMatchObject({
      entityType: 'book_cover',
      sourceUrl: 'https://example.com/attachment-1.jpg',
      selectionSource: 'algorithm',
    });
  });

  it('uses selectedImage over algorithmSuggestion for editorial-manual approvals', async () => {
    const fixture = await createFixture({
      decisions: [
        createDecision({
          candidateKey: 'book:one',
          selectedGroupKey: 'attachment:2',
          algorithmGroupKey: 'attachment:1',
          selectionSource: 'editorial-manual',
        }),
      ],
    });

    const plan = await buildImageRecoveryApplyPlan({
      massDirectory: fixture.massDirectory,
      auditDirectory: fixture.auditDirectory,
      mode: 'dry-run',
      batchSize: 10,
      resume: false,
    });

    expect(plan.result.bookCovers.editorialManualSelections).toBe(1);
    expect(plan.operations[0]).toMatchObject({
      sourceUrl: 'https://example.com/attachment-2.jpg',
      filename: 'attachment-2.jpg',
      selectionSource: 'editorial-manual',
    });
  });

  it('does not process rejected or manual cover decisions', async () => {
    const fixture = await createFixture({
      decisions: [
        createDecision({ candidateKey: 'book:one', decision: 'rejected' }),
        createDecision({ candidateKey: 'book:two', decision: 'manual' }),
      ],
      authorImageManifestStatus: 'applied',
    });

    const plan = await buildImageRecoveryApplyPlan({
      massDirectory: fixture.massDirectory,
      auditDirectory: fixture.auditDirectory,
      mode: 'dry-run',
      batchSize: 10,
      resume: false,
    });

    expect(plan.result.bookCovers).toMatchObject({
      approvedTotal: 0,
      rejected: 1,
      manualReview: 1,
      readyToApply: 0,
    });
    expect(plan.operations.map((operation) => operation.status)).toEqual([
      'skipped',
      'manual_action_required',
    ]);
  });

  it('plans author technical retries separately from editorial cover decisions', async () => {
    const fixture = await createFixture({
      decisions: [],
      authorImageManifestStatus: 'failed',
      authorImageMetadata: { migrationErrorCode: 'IMAGE_TOO_LARGE' },
    });

    const plan = await buildImageRecoveryApplyPlan({
      massDirectory: fixture.massDirectory,
      auditDirectory: fixture.auditDirectory,
      mode: 'dry-run',
      batchSize: 10,
      resume: false,
    });

    expect(plan.result.authorPhotos.technicalRetries).toBe(1);
    expect(plan.operations).toContainEqual(
      expect.objectContaining({
        entityType: 'author_photo',
        category: 'technical_retry',
        sourceUrl: 'https://example.com/author.jpg',
      }),
    );
  });

  it('does not overwrite an existing author photo for safe author photo operations', async () => {
    const plan = createApplyPlan([createOperation('author_photo')]);
    const services = createServices({
      currentAuthorPhotoUrl: 'https://storage.example.com/existing-author.jpg',
    });

    await applyImageRecovery(plan, { services });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.authors.updateAuthor).not.toHaveBeenCalled();
    expect(plan.manifest.entries[0]).toMatchObject({
      status: 'skipped',
      checkpoint: 'skipped',
    });
  });

  it('uploads a book cover and checkpoints only after Storage and DB succeed', async () => {
    const plan = createApplyPlan([createOperation('book_cover')]);
    const persisted: string[] = [];
    const services = createServices({
      onEvent: (event) => persisted.push(event),
    });

    await applyImageRecovery(plan, {
      services,
      checkpointWriter: {
        async persist(currentPlan) {
          persisted.push(currentPlan.manifest.entries[0]?.checkpoint ?? '');
        },
      },
    });

    expect(services.books.updateBook).toHaveBeenCalledWith(bookId, {
      coverUrl: 'https://storage.example.com/book-covers/book-id/cover.jpg',
    });
    expect(plan.manifest.entries[0]).toMatchObject({
      status: 'applied',
      checkpoint: 'applied',
    });
    expect(persisted).toContain('uploaded_pending_db');
    expect(persisted).toContain('applied');
  });

  it('does not duplicate applied operations on resume', async () => {
    const plan = createApplyPlan([createOperation('book_cover')]);
    plan.manifest.entries[0] = {
      ...plan.manifest.entries[0]!,
      status: 'applied',
      checkpoint: 'applied',
      publicUrl: 'https://storage.example.com/book-covers/book-id/cover.jpg',
      storagePath: 'book-id/cover.jpg',
    };
    const services = createServices();

    await applyImageRecovery(plan, { services });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.bookCovers.uploadBookCover).not.toHaveBeenCalled();
    expect(services.books.updateBook).not.toHaveBeenCalled();
  });

  it('marks download and upload failures without updating DB', async () => {
    const downloadPlan = createApplyPlan([createOperation('book_cover')]);
    const uploadPlan = createApplyPlan([createOperation('book_cover')]);
    const downloadServices = createServices({
      downloadImage: vi.fn(async () => {
        throw new Error('download failed');
      }),
    });
    const uploadServices = createServices({
      uploadBookCover: vi.fn(async () => {
        throw new Error('upload failed');
      }),
    });

    await applyImageRecovery(downloadPlan, { services: downloadServices });
    await applyImageRecovery(uploadPlan, { services: uploadServices });

    expect(downloadServices.books.updateBook).not.toHaveBeenCalled();
    expect(uploadServices.books.updateBook).not.toHaveBeenCalled();
    expect(downloadPlan.manifest.entries[0]?.status).toBe('failed');
    expect(uploadPlan.manifest.entries[0]?.status).toBe('failed');
  });

  it('cleans up uploaded cover if DB update fails', async () => {
    const plan = createApplyPlan([createOperation('book_cover')]);
    const services = createServices({
      updateBook: vi.fn(async () => {
        throw new Error('DB failed');
      }),
    });

    await applyImageRecovery(plan, { services });

    expect(services.bookCovers.deleteBookCover).toHaveBeenCalledWith(
      'https://storage.example.com/book-covers/book-id/cover.jpg',
    );
    expect(plan.manifest.entries[0]?.status).toBe('failed');
  });

  it('records cleanup failure without replacing the main failure', async () => {
    const plan = createApplyPlan([createOperation('book_cover')]);
    const services = createServices({
      updateBook: vi.fn(async () => {
        throw new Error('DB failed');
      }),
      deleteBookCover: vi.fn(async () => {
        throw new Error('cleanup failed');
      }),
    });

    await applyImageRecovery(plan, { services });

    expect(plan.manifest.entries[0]).toMatchObject({
      status: 'partial',
      checkpoint: 'cleanup_failed',
    });
    expect(plan.rollbackPlan.warnings[0]).toContain('huerfana');
  });

  it('processes oversized images into a valid file under the application limit', async () => {
    const smallJpeg = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: '#ffffff',
      },
    })
      .jpeg()
      .toBuffer();
    const oversized = Buffer.concat([smallJpeg, Buffer.alloc(6 * 1024 * 1024)]);

    const file = await prepareImageFile(
      {
        body: oversized.buffer.slice(
          oversized.byteOffset,
          oversized.byteOffset + oversized.byteLength,
        ),
        mimeType: 'image/jpeg',
        filename: 'oversized.jpg',
      },
      createOperation('book_cover'),
    );

    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  it('blocks apply when confirm is incorrect via the runner contract', async () => {
    const { runImageRecovery } = await import('./runner');

    await expect(
      runImageRecovery({
        analyze: false,
        dryRun: false,
        preflight: false,
        apply: true,
        diagnoseBookCovers: false,
        adjudicateBookCovers: false,
        editorialReview: false,
        resume: false,
        confirm: 'WRONG',
        batchSize: 10,
        massDirectory: './migration/mass',
        auditDirectory: './migration/audit',
      }),
    ).rejects.toThrow('--confirm IMAGE_RECOVERY');
  });
});

async function createFixture(params: {
  decisions: unknown[];
  authorImageManifestStatus?: string;
  authorImageMetadata?: Record<string, string>;
}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'rueca-image-recovery-apply-'));
  const massDirectory = path.join(directory, 'mass');
  const auditDirectory = path.join(directory, 'audit');
  const massApplyDirectory = path.join(massDirectory, 'apply');
  const imageRecoveryDirectory = path.join(massDirectory, 'image-recovery');

  await mkdir(massApplyDirectory, { recursive: true });
  await mkdir(imageRecoveryDirectory, { recursive: true });
  await mkdir(auditDirectory, { recursive: true });
  await writeJson(path.join(imageRecoveryDirectory, 'editorial-review-decisions.json'), {
    decisions: params.decisions,
  });
  await writeJson(path.join(massApplyDirectory, 'manifest.json'), {
    entries: [
      createMassEntry('book:one', 'book', bookId, '1'),
      createMassEntry('book:two', 'book', 'book-id-two', '2'),
      createMassEntry('author:one', 'author', authorId, '10'),
      createMassEntry('author:one', 'author_image', null, '10', {
        status: params.authorImageManifestStatus ?? 'manual_action_required',
        sourceMetadata: params.authorImageMetadata ?? {},
      }),
    ],
  });
  await writeJson(path.join(massApplyDirectory, 'author-images.json'), [
    {
      candidateKey: 'author:one',
      entityType: 'author',
      sourceWpPostId: '10',
      attachmentId: '10',
      filename: 'author.jpg',
      url: 'https://example.com/author.jpg',
      status: 'failed',
      action: 'UPLOAD',
      confidence: 'high',
      reasons: ['retry'],
    },
  ]);
  await writeJson(path.join(massApplyDirectory, 'book-covers.json'), []);
  await writeFile(
    path.join(auditDirectory, 'attachments-candidates.csv'),
    'wpPostId,title,slug,url,parentId,mimeType,width,height,attachedFile\n10,Author,author,https://example.com/author.jpg,10,image/jpeg,900,1200,author.jpg\n',
  );
  await writeFile(
    path.join(auditDirectory, 'authors-candidates.csv'),
    'candidateKey,sourceWpPostId,name,thumbnailId,imageFieldId\n',
  );
  await writeFile(
    path.join(auditDirectory, 'books-candidates.csv'),
    'candidateKey,sourceWpPostId,title,thumbnailId,imageFieldId\n',
  );

  return { massDirectory, auditDirectory };
}

function createDecision(params: {
  candidateKey: string;
  decision?: 'approved' | 'rejected' | 'manual';
  selectedGroupKey?: string;
  algorithmGroupKey?: string;
  selectionSource?: 'algorithm' | 'editorial-manual' | 'none';
}) {
  const algorithmSuggestion = createEditorialImage(params.algorithmGroupKey ?? 'attachment:1');
  const selectedImage = params.selectedGroupKey
    ? createEditorialImage(params.selectedGroupKey)
    : algorithmSuggestion;

  return {
    candidateKey: params.candidateKey,
    decision: params.decision ?? 'approved',
    algorithmSuggestion,
    selectedImage:
      params.decision === 'rejected' || params.decision === 'manual' ? null : selectedImage,
    selectionSource: params.selectionSource ?? 'algorithm',
    updatedAt: null,
  };
}

function createEditorialImage(groupKey: string) {
  const id = groupKey.replace('attachment:', '');

  return {
    groupKey,
    url: `https://example.com/attachment-${id}.jpg`,
    filename: `attachment-${id}.jpg`,
    width: 900,
    height: 1400,
    positiveCoverScore: 80,
    negativeAuthorScore: 0,
    finalScore: 80,
    origins: ['test'],
    isAlgorithmSuggestion: id === '1',
  };
}

function createMassEntry(
  candidateKey: string,
  entityType: string,
  targetId: string | null,
  sourceWpPostId: string,
  overrides: Partial<{
    status: string;
    checkpoint: string;
    sourceMetadata: Record<string, string>;
  }> = {},
) {
  return {
    candidateKey,
    entityType,
    sourceWpPostId,
    targetId,
    status: overrides.status ?? 'applied',
    checkpoint: overrides.checkpoint ?? 'created',
    sourceMetadata: overrides.sourceMetadata ?? {},
  };
}

function createApplyPlan(operations: ImageRecoveryApplyOperation[]): ImageRecoveryApplyPlan {
  return {
    generatedAt: '2026-07-24T00:00:00.000Z',
    mode: 'apply',
    batchSize: 2,
    operations,
    conflicts: [],
    manifest: {
      generatedAt: '2026-07-24T00:00:00.000Z',
      mode: 'apply',
      batchSize: 2,
      currentBatchIndex: 0,
      completedBatches: [],
      entries: operations.map((operation) => ({
        operationKey: operation.operationKey,
        entityType: operation.entityType,
        candidateKey: operation.candidateKey,
        targetId: operation.targetId,
        status: operation.status,
        checkpoint: 'planned',
        sourceUrl: operation.sourceUrl,
        storagePath: null,
        publicUrl: null,
        previousUrl: null,
        updatedAt: '2026-07-24T00:00:00.000Z',
        sourceMetadata: {
          category: operation.category,
        },
      })),
    },
    rollbackPlan: {
      generatedAt: '2026-07-24T00:00:00.000Z',
      resources: [],
      orderedOperations: [],
      warnings: [],
    },
    result: {
      generatedAt: '2026-07-24T00:00:00.000Z',
      mode: 'apply',
      bookCoversUploaded: 0,
      authorPhotosUploaded: 0,
      alreadyApplied: 0,
      skippedRejected: 0,
      manualActionRequired: 0,
      technicalRetriesRecovered: 0,
      partial: 0,
      failed: 0,
      blockers: 0,
      totalOperationsToApply: operations.length,
      bookCovers: {
        approvedTotal: operations.filter((operation) => operation.entityType === 'book_cover')
          .length,
        algorithmSelections: 0,
        editorialManualSelections: 0,
        rejected: 0,
        manualReview: 0,
        readyToApply: operations.filter((operation) => operation.entityType === 'book_cover')
          .length,
        blocked: 0,
      },
      authorPhotos: {
        safeReady: operations.filter((operation) => operation.entityType === 'author_photo').length,
        technicalRetries: 0,
        alreadyMigrated: 0,
        manualOrAmbiguous: 0,
        blocked: 0,
      },
    },
  };
}

function createOperation(entityType: 'book_cover' | 'author_photo'): ImageRecoveryApplyOperation {
  return {
    operationKey: `${entityType}:${entityType === 'book_cover' ? 'book:one' : 'author:one'}`,
    entityType,
    candidateKey: entityType === 'book_cover' ? 'book:one' : 'author:one',
    sourceWpPostId: '1',
    targetId: entityType === 'book_cover' ? bookId : authorId,
    title: 'Title',
    status: 'ready',
    sourceUrl: 'https://example.com/source.jpg',
    filename: 'source.jpg',
    source: entityType === 'book_cover' ? 'editorial-review' : 'image-recovery-plan',
    selectionSource: 'algorithm',
    category: entityType === 'book_cover' ? 'approved_book_cover' : 'safe_author_photo',
    decision: entityType === 'book_cover' ? 'approved' : 'upload_author_photo',
    transform: {
      required: false,
      maxWidth: entityType === 'book_cover' ? 1800 : 1600,
      maxHeight: entityType === 'book_cover' ? 2800 : 1600,
      quality: entityType === 'book_cover' ? 85 : 82,
      format: 'jpeg',
      correctExifOrientation: true,
    },
    reasons: [],
    blockerCodes: [],
  };
}

function createServices(
  overrides: Partial<{
    currentAuthorPhotoUrl: string | null;
    currentBookCoverUrl: string | null;
    downloadImage: ImageRecoveryApplyServices['downloadImage'];
    uploadBookCover: ImageRecoveryApplyServices['bookCovers']['uploadBookCover'];
    updateBook: ImageRecoveryApplyServices['books']['updateBook'];
    deleteBookCover: ImageRecoveryApplyServices['bookCovers']['deleteBookCover'];
    onEvent: (event: string) => void;
  }> = {},
): ImageRecoveryApplyServices {
  const downloadedImage: DownloadedRecoveryImage = {
    body: new Uint8Array([1, 2, 3]).buffer,
    mimeType: 'image/jpeg',
    filename: 'source.jpg',
  };

  return {
    authors: {
      getAuthorById: vi.fn(async () => ({
        id: authorId,
        photoUrl: overrides.currentAuthorPhotoUrl ?? null,
      })),
      updateAuthor: vi.fn(async (_id, input) => ({
        id: authorId,
        photoUrl: input.photoUrl,
      })),
    },
    books: {
      getBookById: vi.fn(async () => ({
        id: bookId,
        coverUrl: overrides.currentBookCoverUrl ?? null,
      })),
      updateBook:
        overrides.updateBook ??
        vi.fn(async (_id, input) => {
          overrides.onEvent?.('updateBook');
          return {
            id: bookId,
            coverUrl: input.coverUrl,
          };
        }),
    },
    authorImages: {
      uploadAuthorImage: vi.fn(async () => ({
        path: 'author-id/photo.jpg',
        publicUrl: 'https://storage.example.com/authors/author-id/photo.jpg',
      })),
      deleteAuthorImage: vi.fn(async () => undefined),
    },
    bookCovers: {
      uploadBookCover:
        overrides.uploadBookCover ??
        vi.fn(async () => {
          overrides.onEvent?.('uploadBookCover');
          return {
            path: 'book-id/cover.jpg',
            publicUrl: 'https://storage.example.com/book-covers/book-id/cover.jpg',
          };
        }),
      deleteBookCover: overrides.deleteBookCover ?? vi.fn(async () => undefined),
    },
    downloadImage:
      overrides.downloadImage ??
      vi.fn(async () => {
        overrides.onEvent?.('downloadImage');
        return downloadedImage;
      }),
  };
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
