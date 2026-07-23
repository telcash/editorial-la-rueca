import { describe, expect, it, vi } from 'vitest';

import { createRollbackPlan, type PilotCheckpointWriter } from './output';
import { applyPilotMigration, type PilotApplyServices } from './apply';
import { planPilotMigration } from './planner';
import type {
  PilotAuditData,
  PilotAttachmentCandidate,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotManifest,
  PilotPlan,
  PilotRelationshipCandidate,
  PilotResult,
} from './types';

function notFound(name: string) {
  const error = new Error(name);
  error.name = name;

  return error;
}

function createAuthorCandidate(
  overrides: Partial<PilotAuthorCandidate> = {},
): PilotAuthorCandidate {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    name: 'Autora Uno',
    normalizedName: 'autora uno',
    slug: 'autora-uno',
    normalizedSlug: 'autora-uno',
    oldUrl: 'https://example.com/autor/autora-uno/',
    rawReview: '',
    plainTextPreview: '',
    bioCandidate: '',
    thumbnailId: '',
    thumbnailUrl: '',
    imageFieldId: '',
    imageFieldUrl: '',
    status: 'publish',
    classification: 'author_only_candidate',
    classificationReasons: 'Sin tf_libro',
    possibleDuplicateGroup: '',
    reviewLikelyType: 'author_bio',
    reviewConfidence: 'medium',
    yoastMetaTitle: '',
    yoastMetaDescription: '',
    canonicalUrl: '',
    ...overrides,
  };
}

function createBookCandidate(overrides: Partial<PilotBookCandidate> = {}): PilotBookCandidate {
  return {
    candidateKey: 'book:1',
    sourceWpPostId: '1',
    title: 'Libro Uno',
    normalizedTitle: 'libro uno',
    sourceAuthorTitle: 'Autora Uno',
    sourceAuthorSlug: 'autora-uno',
    sourceOldUrl: 'https://example.com/autor/autora-uno/',
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    videoId: '',
    thumbnailId: '',
    thumbnailUrl: '',
    duplicateGroupId: '',
    ...overrides,
  };
}

function createRelationshipCandidate(
  overrides: Partial<PilotRelationshipCandidate> = {},
): PilotRelationshipCandidate {
  return {
    bookCandidateKey: 'book:1',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    confidence: 'high',
    reason: 'Relación inferida desde fixture.',
    ...overrides,
  };
}

function createCoverAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '10',
    title: 'Portada Libro Uno',
    slug: 'portada-libro-uno',
    url: 'https://example.com/cover.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '600',
    height: '900',
    attachedFile: 'portada-libro-uno.jpg',
    ...overrides,
  };
}

function createAuditData(overrides: Partial<PilotAuditData> = {}): PilotAuditData {
  return {
    sample: {
      generatedAt: '2026-07-19T00:00:00.000Z',
      cases: [
        {
          kind: 'fixture',
          reason: 'fixture',
          sourceWpPostId: '1',
          authorCandidateKey: 'author:1',
          bookCandidateKey: 'book:1',
          title: 'Libro Uno',
        },
      ],
    },
    authors: [createAuthorCandidate()],
    books: [createBookCandidate()],
    relationships: [createRelationshipCandidate()],
    attachments: [],
    issues: [],
    decisions: {},
    ...overrides,
  };
}

function createPlan(data: PilotAuditData = createAuditData()): PilotPlan {
  return planPilotMigration(data, {
    auditSource: './migration/audit',
    mode: 'apply',
  });
}

function createServices(overrides: Partial<PilotApplyServices> = {}): PilotApplyServices {
  return {
    authors: {
      getAuthorBySlug: vi.fn(async () => {
        throw notFound('AuthorNotFoundError');
      }),
      createAuthor: vi.fn(async (input) => ({
        id: '00000000-0000-4000-8000-000000000001',
        slug: input.slug,
      })),
      updateAuthor: vi.fn(async () => ({
        id: '00000000-0000-4000-8000-000000000001',
        slug: 'autora-uno',
      })),
    },
    books: {
      getBookById: vi.fn(async () => ({
        id: '00000000-0000-4000-8000-000000000101',
        coverUrl: null,
      })),
      getBookBySlug: vi.fn(async () => {
        throw notFound('BookNotFoundError');
      }),
      createBook: vi.fn(async (input) => ({
        id: '00000000-0000-4000-8000-000000000101',
        slug: input.slug,
        editions: [{ id: '00000000-0000-4000-8000-000000000201' }],
      })),
      updateBook: vi.fn(async () => ({
        id: '00000000-0000-4000-8000-000000000101',
        slug: 'libro-uno',
        editions: [{ id: '00000000-0000-4000-8000-000000000201' }],
      })),
    },
    authorImages: {
      uploadAuthorImage: vi.fn(async () => ({
        path: '00000000-0000-4000-8000-000000000001/image.jpg',
        publicUrl: 'https://example.com/storage/image.jpg',
      })),
      deleteAuthorImage: vi.fn(async () => undefined),
    },
    bookCovers: {
      uploadBookCover: vi.fn(async () => ({
        path: '00000000-0000-4000-8000-000000000101/cover.jpg',
        publicUrl: 'https://example.com/storage/cover.jpg',
      })),
      deleteBookCover: vi.fn(async () => undefined),
    },
    downloadImage: vi.fn(async () => ({
      file: new File(['image'], 'image.jpg', { type: 'image/jpeg' }),
      mimeType: 'image/jpeg' as const,
    })),
    ...overrides,
  };
}

function createWriter() {
  const snapshots: { manifest: PilotPlan['manifest']; result: PilotResult; rollback: unknown }[] =
    [];
  const writer: PilotCheckpointWriter = {
    async persist(plan, result) {
      snapshots.push({
        manifest: structuredClone(plan.manifest),
        result: structuredClone(result),
        rollback: createRollbackPlan(plan),
      });
    },
  };

  return { writer, snapshots };
}

function createExistingManifestWithAppliedAuthors(
  plan: PilotPlan,
  authorIdsByCandidateKey: Record<string, string>,
): PilotManifest {
  return {
    ...plan.manifest,
    entries: plan.manifest.entries.map((entry) => {
      if (entry.sourceType !== 'author') {
        return entry;
      }

      const targetId = authorIdsByCandidateKey[entry.candidateKey];

      return targetId
        ? {
            ...entry,
            targetId,
            status: 'applied',
            checkpoint: 'author_created',
          }
        : entry;
    }),
  };
}

function createRetryImageManifest(
  plan: PilotPlan,
  options: {
    authorId?: string;
    bookId?: string;
    imageEntryStatus?: 'planned' | 'partial' | 'failed';
    imageStatus?: string;
    imageTargetId?: string | null;
    resultingUrl?: string;
  } = {},
): PilotManifest {
  const authorId = options.authorId ?? '00000000-0000-4000-8000-000000000001';
  const bookId = options.bookId ?? '00000000-0000-4000-8000-000000000101';

  return {
    ...plan.manifest,
    entries: plan.manifest.entries.map((entry) => {
      if (entry.sourceType === 'author') {
        return {
          ...entry,
          targetId: authorId,
          status: 'applied',
          checkpoint: 'author_created',
        };
      }

      if (entry.sourceType === 'book') {
        return {
          ...entry,
          targetId: bookId,
          status: 'partial',
          checkpoint: 'image_failed',
        };
      }

      if (entry.sourceType === 'relation' || entry.sourceType === 'edition') {
        return {
          ...entry,
          targetId: bookId,
          status: 'applied',
          checkpoint: 'book_created',
        };
      }

      if (entry.sourceType === 'image' && entry.candidateKey === 'book:1') {
        return {
          ...entry,
          targetId: options.imageTargetId ?? null,
          status: options.imageEntryStatus ?? 'partial',
          imageStatus: options.imageStatus ?? 'failed',
          checkpoint: 'image_failed',
          sourceMetadata: {
            ...entry.sourceMetadata,
            resultingUrl: options.resultingUrl ?? null,
          },
        };
      }

      return entry;
    }),
  };
}

describe('applyPilotMigration hardening', () => {
  it('persists manifest incrementally after creating an author', async () => {
    const plan = createPlan();
    const { writer, snapshots } = createWriter();

    await applyPilotMigration(plan, {
      services: createServices(),
      checkpointWriter: writer,
      skipEnvironmentCheck: true,
    });

    expect(
      snapshots[0]?.manifest.entries.find((entry) => entry.sourceType === 'author'),
    ).toMatchObject({
      targetId: '00000000-0000-4000-8000-000000000001',
      status: 'applied',
      checkpoint: 'author_created',
    });
  });

  it('keeps the author checkpoint when a later book creation fails', async () => {
    const plan = createPlan();
    const { writer, snapshots } = createWriter();
    const services = createServices({
      books: {
        ...createServices().books,
        getBookBySlug: vi.fn(async () => {
          throw notFound('BookNotFoundError');
        }),
        createBook: vi.fn(async () => {
          throw new Error('book create failed');
        }),
      },
    });

    const result = await applyPilotMigration(plan, {
      services,
      checkpointWriter: writer,
      skipEnvironmentCheck: true,
    });

    expect(result.issues.some((issue) => issue.code === 'PILOT_APPLY_UNEXPECTED_ERROR')).toBe(true);
    expect(
      snapshots.at(-1)?.manifest.entries.find((entry) => entry.sourceType === 'author'),
    ).toMatchObject({
      targetId: '00000000-0000-4000-8000-000000000001',
      status: 'applied',
    });
  });

  it('does not duplicate an applied author on rerun', async () => {
    const plan = createPlan();
    const services = createServices();
    const existingManifest: PilotManifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) =>
        entry.sourceType === 'author'
          ? {
              ...entry,
              targetId: '00000000-0000-4000-8000-000000000001',
              status: 'applied',
            }
          : entry,
      ),
    };

    await applyPilotMigration(plan, {
      existingManifest,
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
  });

  it('does not recreate 8 applied authors when resuming from manifest', async () => {
    const authorIdsByCandidateKey = Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [
        `author:${index + 1}`,
        `00000000-0000-4000-8000-00000000000${index + 1}`,
      ]),
    );
    const authors = Object.keys(authorIdsByCandidateKey).map((candidateKey, index) =>
      createAuthorCandidate({
        candidateKey,
        sourceWpPostId: String(index + 1),
        name: `Autora ${index + 1}`,
        slug: `autora-${index + 1}`,
      }),
    );
    const plan = createPlan(
      createAuditData({
        sample: {
          generatedAt: '2026-07-19T00:00:00.000Z',
          cases: Object.keys(authorIdsByCandidateKey).map((candidateKey, index) => ({
            kind: 'author_resume',
            reason: 'fixture',
            sourceWpPostId: String(index + 1),
            authorCandidateKey: candidateKey,
            title: `Autora ${index + 1}`,
          })),
        },
        authors,
        books: [],
        relationships: [],
      }),
    );
    const services = createServices();

    const result = await applyPilotMigration(plan, {
      existingManifest: createExistingManifestWithAppliedAuthors(plan, authorIdsByCandidateKey),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(result.skipped).toBe(8);
  });

  it('does not duplicate an applied book on rerun', async () => {
    const plan = createPlan();
    const services = createServices();
    const existingManifest: PilotManifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) => {
        if (entry.sourceType === 'author') {
          return {
            ...entry,
            targetId: '00000000-0000-4000-8000-000000000001',
            status: 'applied',
          };
        }

        if (entry.sourceType === 'book') {
          return {
            ...entry,
            targetId: '00000000-0000-4000-8000-000000000101',
            status: 'applied',
          };
        }

        return entry;
      }),
    };

    await applyPilotMigration(plan, {
      existingManifest,
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.books.createBook).not.toHaveBeenCalled();
  });

  it('passes only domain fields to BookService.createBook', async () => {
    const plan = createPlan();
    const services = createServices();

    await applyPilotMigration(plan, {
      services,
      skipEnvironmentCheck: true,
    });

    const createBook = vi.mocked(services.books.createBook);
    const input = createBook.mock.calls[0]?.[0];

    expect(input).toBeDefined();

    if (!input) {
      throw new Error('Expected createBook input.');
    }

    expect(input.authorIds).toEqual(['00000000-0000-4000-8000-000000000001']);
    expect(input.editions).toHaveLength(1);
    expect(input.isPublished).toBe(false);
    expect(input.isFeatured).toBe(false);
    expect(input).not.toHaveProperty('authorCandidateKeys');
    expect(input).not.toHaveProperty('candidateKey');
    expect(input).not.toHaveProperty('sourceMetadata');
  });

  it('resolves a single book author from an applied manifest targetId', async () => {
    const plan = createPlan();
    const services = createServices();

    await applyPilotMigration(plan, {
      existingManifest: createExistingManifestWithAppliedAuthors(plan, {
        'author:1': '10000000-0000-4000-8000-000000000001',
      }),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(services.books.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        authorIds: ['10000000-0000-4000-8000-000000000001'],
      }),
    );
  });

  it('blocks a book when an author candidate cannot be mapped to a target UUID', async () => {
    const plan = createPlan(
      createAuditData({
        authors: [],
      }),
    );
    const services = createServices();

    const result = await applyPilotMigration(plan, {
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.books.createBook).not.toHaveBeenCalled();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'PILOT_AUTHOR_MAPPING_MISSING',
          candidateKey: 'book:1',
          details: 'author:1',
        }),
      ]),
    );
  });

  it('blocks existing author slugs outside the manifest', async () => {
    const plan = createPlan();
    const services = createServices({
      authors: {
        ...createServices().authors,
        getAuthorBySlug: vi.fn(async () => ({
          id: '00000000-0000-4000-8000-000000009999',
          slug: 'autora-uno',
        })),
      },
    });

    const result = await applyPilotMigration(plan, {
      services,
      skipEnvironmentCheck: true,
    });

    expect(
      result.issues.some((issue) => issue.code === 'EXISTING_AUTHOR_SLUG_REQUIRES_RECONCILIATION'),
    ).toBe(true);
    expect(services.authors.createAuthor).not.toHaveBeenCalled();
  });

  it('does not upload an already applied image again', async () => {
    const plan = createPlan(
      createAuditData({
        authors: [
          createAuthorCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/author.jpg',
          }),
        ],
        books: [],
        relationships: [],
      }),
    );
    const services = createServices();
    const existingManifest: PilotManifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) => {
        if (entry.sourceType === 'author') {
          return {
            ...entry,
            targetId: '00000000-0000-4000-8000-000000000001',
            status: 'applied',
          };
        }

        if (entry.sourceType === 'image') {
          return {
            ...entry,
            targetId: '00000000-0000-4000-8000-000000000001/image.jpg',
            status: 'applied',
            imageStatus: 'uploaded',
          };
        }

        return entry;
      }),
    };

    await applyPilotMigration(plan, {
      existingManifest,
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
  });

  it('retries a failed image on rerun', async () => {
    const plan = createPlan(
      createAuditData({
        authors: [
          createAuthorCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/author.jpg',
          }),
        ],
        books: [],
        relationships: [],
      }),
    );
    const services = createServices();
    const existingManifest: PilotManifest = {
      ...plan.manifest,
      entries: plan.manifest.entries.map((entry) => {
        if (entry.sourceType === 'author') {
          return {
            ...entry,
            targetId: '00000000-0000-4000-8000-000000000001',
            status: 'applied',
          };
        }

        if (entry.sourceType === 'image') {
          return {
            ...entry,
            status: 'partial',
            imageStatus: 'failed',
          };
        }

        return entry;
      }),
    };

    await applyPilotMigration(plan, {
      existingManifest,
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).toHaveBeenCalledTimes(1);
    expect(services.authorImages.uploadAuthorImage).toHaveBeenCalledTimes(1);
  });

  it('retry-images does not recreate authors, books, relations or editions', async () => {
    const plan = createPlan();
    const services = createServices();

    const result = await applyPilotMigration(plan, {
      existingManifest: createRetryImageManifest(plan),
      services,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(services.books.createBook).not.toHaveBeenCalled();
    expect(result.createdAuthors).toBe(0);
    expect(result.createdBooks).toBe(0);
    expect(result.createdRelations).toBe(0);
    expect(result.createdEditions).toBe(0);
  });

  it('retry-images uploads a failed book cover and persists coverUrl', async () => {
    const plan = createPlan(
      createAuditData({
        books: [
          createBookCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/cover.jpg',
          }),
        ],
        attachments: [createCoverAttachment()],
      }),
    );
    const { writer, snapshots } = createWriter();
    const services = createServices();

    const result = await applyPilotMigration(plan, {
      existingManifest: createRetryImageManifest(plan),
      services,
      checkpointWriter: writer,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).toHaveBeenCalledTimes(1);
    expect(services.bookCovers.uploadBookCover).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000101',
      expect.any(File),
    );
    expect(services.books.updateBook).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101', {
      coverUrl: 'https://example.com/storage/cover.jpg',
    });
    expect(result.uploadedBookCovers).toBe(1);
    expect(
      snapshots.at(-1)?.manifest.entries.find((entry) => entry.sourceType === 'image'),
    ).toMatchObject({
      status: 'applied',
      imageStatus: 'uploaded',
      checkpoint: 'complete',
    });
  });

  it('retry-images accepts a planned image when the existing book is waiting for image retry', async () => {
    const plan = createPlan(
      createAuditData({
        books: [
          createBookCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/cover.jpg',
          }),
        ],
        attachments: [createCoverAttachment()],
      }),
    );
    const services = createServices();

    await applyPilotMigration(plan, {
      existingManifest: createRetryImageManifest(plan, {
        imageEntryStatus: 'planned',
        imageStatus: 'planned',
      }),
      services,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.books.createBook).not.toHaveBeenCalled();
    expect(services.downloadImage).toHaveBeenCalledTimes(1);
    expect(services.bookCovers.uploadBookCover).toHaveBeenCalledTimes(1);
    expect(services.books.updateBook).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101', {
      coverUrl: 'https://example.com/storage/cover.jpg',
    });
  });

  it('retry-images does not reupload when an image was uploaded before persistence failed', async () => {
    const plan = createPlan(
      createAuditData({
        books: [
          createBookCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/cover.jpg',
          }),
        ],
        attachments: [createCoverAttachment()],
      }),
    );
    const services = createServices();

    await applyPilotMigration(plan, {
      existingManifest: createRetryImageManifest(plan, {
        imageTargetId: '00000000-0000-4000-8000-000000000101/cover.jpg',
        resultingUrl: 'https://example.com/storage/existing-cover.jpg',
      }),
      services,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.bookCovers.uploadBookCover).not.toHaveBeenCalled();
    expect(services.books.updateBook).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000101', {
      coverUrl: 'https://example.com/storage/existing-cover.jpg',
    });
  });

  it('marks oversized images as manual action required without retrying upload', async () => {
    const plan = createPlan(
      createAuditData({
        books: [],
        relationships: [],
        authors: [
          createAuthorCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/oversized.jpg',
          }),
        ],
      }),
    );
    const { writer, snapshots } = createWriter();
    const services = createServices({
      downloadImage: vi.fn(async () => {
        throw new Error('Image exceeds 5 MB');
      }),
    });
    const existingManifest = createExistingManifestWithAppliedAuthors(plan, {
      'author:1': '00000000-0000-4000-8000-000000000001',
    });
    existingManifest.entries = existingManifest.entries.map((entry) =>
      entry.sourceType === 'image'
        ? {
            ...entry,
            status: 'partial',
            imageStatus: 'failed',
            checkpoint: 'image_failed',
          }
        : entry,
    );

    const result = await applyPilotMigration(plan, {
      existingManifest,
      services,
      checkpointWriter: writer,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'IMAGE_TOO_LARGE',
          candidateKey: 'author:1',
        }),
      ]),
    );
    expect(
      snapshots.at(-1)?.manifest.entries.find((entry) => entry.sourceType === 'image'),
    ).toMatchObject({
      status: 'skipped',
      imageStatus: 'manual_action_required',
      checkpoint: 'manual_action_required',
      sourceMetadata: expect.objectContaining({
        migrationErrorCode: 'IMAGE_TOO_LARGE',
        retryable: false,
        manualActionRequired: true,
      }),
    });
  });

  it('retry-images leaves ambiguous images skipped', async () => {
    const plan = createPlan(
      createAuditData({
        authors: [
          createAuthorCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/author.jpg',
            imageFieldId: '11',
            imageFieldUrl: 'https://example.com/another.jpg',
          }),
        ],
        books: [],
        relationships: [],
      }),
    );
    const services = createServices();

    await applyPilotMigration(plan, {
      existingManifest: createExistingManifestWithAppliedAuthors(plan, {
        'author:1': '00000000-0000-4000-8000-000000000001',
      }),
      services,
      retryImagesOnly: true,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
  });

  it('preserves targetId when image persistence fails partially', async () => {
    const plan = createPlan(
      createAuditData({
        authors: [
          createAuthorCandidate({
            thumbnailId: '10',
            thumbnailUrl: 'https://example.com/author.jpg',
          }),
        ],
        books: [],
        relationships: [],
      }),
    );
    const { writer, snapshots } = createWriter();
    const services = createServices({
      authors: {
        ...createServices().authors,
        updateAuthor: vi.fn(async () => {
          throw new Error('update failed');
        }),
      },
    });

    const result = await applyPilotMigration(plan, {
      services,
      checkpointWriter: writer,
      skipEnvironmentCheck: true,
    });

    const imageEntry = snapshots
      .at(-1)
      ?.manifest.entries.find((entry) => entry.sourceType === 'image');

    expect(result.partial).toBe(1);
    expect(imageEntry).toMatchObject({
      targetId: '00000000-0000-4000-8000-000000000001/image.jpg',
      status: 'partial',
      imageStatus: 'failed',
    });
  });

  it('updates rollback-plan incrementally with created resources', async () => {
    const plan = createPlan();
    const { writer, snapshots } = createWriter();

    await applyPilotMigration(plan, {
      services: createServices(),
      checkpointWriter: writer,
      skipEnvironmentCheck: true,
    });

    expect(snapshots.at(-1)?.rollback).toMatchObject({
      authors: ['00000000-0000-4000-8000-000000000001'],
      books: ['00000000-0000-4000-8000-000000000101'],
    });
  });

  it('keeps checkpoints when an unexpected global exception occurs', async () => {
    const plan = createPlan();
    const { writer, snapshots } = createWriter();
    const services = createServices({
      books: {
        ...createServices().books,
        getBookBySlug: vi.fn(async () => {
          throw notFound('BookNotFoundError');
        }),
        createBook: vi.fn(async () => {
          throw new Error('unexpected');
        }),
      },
    });

    const result = await applyPilotMigration(plan, {
      services,
      checkpointWriter: writer,
      skipEnvironmentCheck: true,
    });

    expect(result.failed).toBeGreaterThan(0);
    expect(
      snapshots
        .at(-1)
        ?.result.issues.some((issue) => issue.code === 'PILOT_APPLY_UNEXPECTED_ERROR'),
    ).toBe(true);
  });

  it('merges Cruce de Pasos into one planned book with two author relations', () => {
    const plan = createPlan(
      createAuditData({
        sample: {
          generatedAt: '2026-07-19T00:00:00.000Z',
          cases: [
            {
              kind: 'duplicate_multi_author',
              reason: 'fixture',
              sourceWpPostId: '563',
              bookCandidateKey: 'book:cruce de pasos',
              title: 'Cruce de Pasos',
            },
          ],
        },
        authors: [
          createAuthorCandidate({
            candidateKey: 'author:563',
            sourceWpPostId: '563',
            name: 'Ana Córdoba del Campo',
            slug: 'ana-cordoba-del-campo',
          }),
          createAuthorCandidate({
            candidateKey: 'author:619',
            sourceWpPostId: '619',
            name: 'Ángel García Muñoz',
            slug: 'angel-garcia-munoz',
          }),
        ],
        books: [
          createBookCandidate({
            candidateKey: 'book:cruce de pasos',
            sourceWpPostId: '619',
            title: 'Cruce de Pasos',
            normalizedTitle: 'cruce de pasos',
            duplicateGroupId: 'duplicate-book:cruce de pasos',
          }),
        ],
        relationships: [
          createRelationshipCandidate({
            bookCandidateKey: 'book:cruce de pasos',
            authorCandidateKey: 'author:563',
            sourceWpPostId: '563',
          }),
          createRelationshipCandidate({
            bookCandidateKey: 'book:cruce de pasos',
            authorCandidateKey: 'author:619',
            sourceWpPostId: '619',
          }),
        ],
        decisions: {
          bookDuplicateGroups: {
            'duplicate-book:cruce de pasos': {
              action: 'merge',
              canonicalCandidateKey: 'book:cruce de pasos',
              mergeAuthorRelations: true,
            },
          },
        },
      }),
    );

    expect(plan.books).toHaveLength(1);
    expect(plan.books[0]).toMatchObject({
      candidateKey: 'book:cruce de pasos',
      status: 'planned',
    });
    expect(plan.books[0]?.input.authorCandidateKeys).toEqual(['author:563', 'author:619']);
    expect(plan.relations.every((relation) => relation.status === 'planned')).toBe(true);
  });

  it('creates one Cruce de Pasos book with two resolved author IDs', async () => {
    const plan = createPlan(
      createAuditData({
        sample: {
          generatedAt: '2026-07-19T00:00:00.000Z',
          cases: [
            {
              kind: 'duplicate_multi_author',
              reason: 'fixture',
              sourceWpPostId: '563',
              bookCandidateKey: 'book:cruce de pasos',
              title: 'Cruce de Pasos',
            },
          ],
        },
        authors: [
          createAuthorCandidate({
            candidateKey: 'author:563',
            sourceWpPostId: '563',
            name: 'Ana Córdoba del Campo',
            slug: 'ana-cordoba-del-campo',
          }),
          createAuthorCandidate({
            candidateKey: 'author:619',
            sourceWpPostId: '619',
            name: 'Ángel García Muñoz',
            slug: 'angel-garcia-munoz',
          }),
        ],
        books: [
          createBookCandidate({
            candidateKey: 'book:cruce de pasos',
            sourceWpPostId: '619',
            title: 'Cruce de Pasos',
            normalizedTitle: 'cruce de pasos',
            duplicateGroupId: 'duplicate-book:cruce de pasos',
          }),
        ],
        relationships: [
          createRelationshipCandidate({
            bookCandidateKey: 'book:cruce de pasos',
            authorCandidateKey: 'author:563',
            sourceWpPostId: '563',
          }),
          createRelationshipCandidate({
            bookCandidateKey: 'book:cruce de pasos',
            authorCandidateKey: 'author:619',
            sourceWpPostId: '619',
          }),
        ],
        decisions: {
          bookDuplicateGroups: {
            'duplicate-book:cruce de pasos': {
              action: 'merge',
              canonicalCandidateKey: 'book:cruce de pasos',
              mergeAuthorRelations: true,
            },
          },
        },
      }),
    );
    const services = createServices();

    await applyPilotMigration(plan, {
      existingManifest: createExistingManifestWithAppliedAuthors(plan, {
        'author:563': 'ddc02801-7185-4902-a353-304247dfe612',
        'author:619': '35ce3606-59f1-493a-bd54-169c33abbee3',
      }),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(services.books.createBook).toHaveBeenCalledTimes(1);
    expect(services.books.createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Cruce de Pasos',
        authorIds: ['ddc02801-7185-4902-a353-304247dfe612', '35ce3606-59f1-493a-bd54-169c33abbee3'],
      }),
    );
    expect(vi.mocked(services.books.createBook).mock.calls[0]?.[0]).not.toHaveProperty(
      'authorCandidateKeys',
    );
  });
});
