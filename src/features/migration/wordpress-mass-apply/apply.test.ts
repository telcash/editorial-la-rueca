import { describe, expect, it, vi } from 'vitest';

import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassRelationPlan,
} from '@/features/migration/wordpress-mass/types';
import { applyMassMigration, type MassApplyServices } from './apply';
import { planMassApply } from './planner';
import type { MassApplyPlan } from './types';
import type { PilotManifest } from '@/features/migration/wordpress-pilot/types';

const authorId = '11111111-1111-4111-8111-111111111111';
const bookId = '22222222-2222-4222-8222-222222222222';
const editionId = '33333333-3333-4333-8333-333333333333';

interface ServiceOverrides {
  authors?: Partial<MassApplyServices['authors']>;
  books?: Partial<MassApplyServices['books']>;
  authorImages?: Partial<MassApplyServices['authorImages']>;
  bookCovers?: Partial<MassApplyServices['bookCovers']>;
  downloadImage?: MassApplyServices['downloadImage'];
}

function createAuthor(overrides: Partial<MassAuthorPlan> = {}): MassAuthorPlan {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      name: 'Autora Uno',
      slug: 'autora-uno',
      shortBio: null,
      biography: null,
      photoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      country: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {
      possibleDuplicateGroup: null,
      oldUrl: 'https://example.com/autor/autora-uno/',
    },
    ...overrides,
  };
}

function createBook(overrides: Partial<MassBookPlan> = {}): MassBookPlan {
  return {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      title: 'Libro Uno',
      subtitle: null,
      slug: 'libro-uno',
      description: null,
      excerpt: null,
      coverUrl: null,
      originalPublicationDate: null,
      language: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      authorIds: [authorId],
      categoryIds: [],
      editions: [],
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {},
    ...overrides,
  };
}

function createRelation(overrides: Partial<MassRelationPlan> = {}): MassRelationPlan {
  return {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    confidence: 'high',
    reason: 'fixture',
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    ...overrides,
  };
}

function createAuthorImage(overrides: Partial<MassAuthorImagePlan> = {}): MassAuthorImagePlan {
  return {
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'foto.jpg',
    url: 'https://example.com/foto.jpg',
    status: 'AUTO_UPLOAD',
    confidence: 'high',
    score: 90,
    reasons: ['fixture'],
    ...overrides,
  };
}

function createBookCover(overrides: Partial<MassBookCoverPlan> = {}): MassBookCoverPlan {
  return {
    bookCandidateKey: 'book:uno',
    sourceWpPostId: '1',
    attachmentId: '20',
    filename: 'cover.jpg',
    url: 'https://example.com/cover.jpg',
    score: 110,
    confidence: 'high',
    status: 'AUTO_UPLOAD_CANDIDATE',
    reasons: ['fixture'],
    ...overrides,
  };
}

function createPlan(pilotManifest: PilotManifest | null = null): MassApplyPlan {
  return planMassApply({
    generatedAt: '2026-07-23T00:00:00.000Z',
    mode: 'apply',
    batchSize: 20,
    authors: [createAuthor()],
    books: [createBook()],
    relations: [createRelation()],
    authorImages: [createAuthorImage()],
    bookCovers: [createBookCover()],
    pilotManifest,
  });
}

function createPilotManifest(): PilotManifest {
  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    auditSource: './migration/audit',
    entries: [
      {
        sourceType: 'author',
        sourceWpPostId: '1',
        candidateKey: 'author:1',
        targetEntityType: 'authors',
        targetId: authorId,
        status: 'applied',
        warnings: [],
        sourceMetadata: {},
        imageStatus: 'skipped',
        checkpoint: 'complete',
        createdAt: '2026-07-23T00:00:00.000Z',
      },
      {
        sourceType: 'book',
        sourceWpPostId: '1',
        candidateKey: 'book:uno',
        targetEntityType: 'books',
        targetId: bookId,
        status: 'applied',
        warnings: [],
        sourceMetadata: {},
        imageStatus: 'skipped',
        checkpoint: 'complete',
        createdAt: '2026-07-23T00:00:00.000Z',
      },
    ],
  };
}

function createServices(overrides: ServiceOverrides = {}): MassApplyServices {
  const file = new File(['image'], 'image.jpg', { type: 'image/jpeg' });
  const appliedBook = {
    id: bookId,
    slug: 'libro-uno',
    authors: [{ id: authorId, sortOrder: 0 }],
    editions: [
      {
        id: editionId,
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
      },
    ],
  };

  const services: MassApplyServices = {
    authors: {
      getAuthorById: vi.fn(async () => ({ id: authorId, slug: 'autora-uno' })),
      createAuthor: vi.fn(async (input) => ({ id: authorId, slug: input.slug })),
      updateAuthor: vi.fn(async () => ({ id: authorId, slug: 'autora-uno' })),
    },
    books: {
      getBookById: vi.fn(async () => appliedBook),
      createBook: vi.fn(async (input) => ({ ...appliedBook, slug: input.slug })),
      updateBook: vi.fn(async () => appliedBook),
    },
    authorImages: {
      uploadAuthorImage: vi.fn(async () => ({
        path: `${authorId}/author.jpg`,
        publicUrl: 'https://storage.example.com/authors/author.jpg',
      })),
      deleteAuthorImage: vi.fn(async () => undefined),
    },
    bookCovers: {
      uploadBookCover: vi.fn(async () => ({
        path: `${bookId}/cover.jpg`,
        publicUrl: 'https://storage.example.com/book-covers/cover.jpg',
      })),
      deleteBookCover: vi.fn(async () => undefined),
    },
    downloadImage: vi.fn(async () => ({ file })),
  };

  return {
    authors: { ...services.authors, ...overrides.authors },
    books: { ...services.books, ...overrides.books },
    authorImages: { ...services.authorImages, ...overrides.authorImages },
    bookCovers: { ...services.bookCovers, ...overrides.bookCovers },
    downloadImage: overrides.downloadImage ?? services.downloadImage,
  };
}

describe('applyMassMigration', () => {
  it('creates authors, books, relations, editions and images from a mass plan', async () => {
    const plan = createPlan();
    const services = createServices();
    const persistedCheckpoints: MassApplyPlan[] = [];

    await applyMassMigration(plan, {
      services,
      checkpointWriter: {
        async persist(updatedPlan) {
          persistedCheckpoints.push(structuredClone(updatedPlan));
        },
      },
    });

    expect(services.authors.createAuthor).toHaveBeenCalledTimes(1);
    expect(services.books.createBook).toHaveBeenCalledWith(
      expect.objectContaining({ authorIds: [authorId] }),
    );
    expect(services.authorImages.uploadAuthorImage).toHaveBeenCalledWith(
      authorId,
      expect.any(File),
      expect.any(String),
    );
    expect(services.bookCovers.uploadBookCover).toHaveBeenCalledWith(
      bookId,
      expect.any(File),
      expect.any(String),
    );
    expect(plan.result).toMatchObject({
      authorsCreated: 1,
      booksCreated: 1,
      editionsCreated: 1,
      relationsCreated: 1,
      authorImagesUploaded: 1,
      bookCoversUploaded: 1,
      failed: 0,
    });
    expect(plan.rollbackPlan.resources.authors).toEqual([
      { id: authorId, candidateKey: 'author:1', preexisting: false },
    ]);
    expect(plan.rollbackPlan.resources.books).toEqual([
      { id: bookId, candidateKey: 'book:uno', preexisting: false },
    ]);
    expect(persistedCheckpoints.length).toBeGreaterThan(1);
  });

  it('does not recreate entities already marked as applied in the manifest', async () => {
    const plan = createPlan();
    const services = createServices();

    plan.manifest.entries = plan.manifest.entries.map((entry) => {
      if (entry.entityType === 'author') {
        return { ...entry, status: 'applied', checkpoint: 'author_created', targetId: authorId };
      }

      if (entry.entityType === 'book') {
        return { ...entry, status: 'applied', checkpoint: 'book_created', targetId: bookId };
      }

      return entry;
    });

    await applyMassMigration(plan, { services });

    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(services.books.createBook).not.toHaveBeenCalled();
  });

  it('tracks uploaded cover cleanup without replacing the primary persistence error', async () => {
    const plan = createPlan();
    const updateBook = vi.fn(async () => {
      throw new Error('database unavailable');
    });
    const deleteBookCover = vi.fn(async () => {
      throw new Error('storage cleanup failed');
    });
    const services = createServices({
      books: {
        getBookById: vi.fn(async () => ({
          id: bookId,
          slug: 'libro-uno',
          authors: [{ id: authorId, sortOrder: 0 }],
          editions: [],
        })),
        createBook: vi.fn(async (input) => ({
          id: bookId,
          slug: input.slug,
          authors: [{ id: authorId, sortOrder: 0 }],
          editions: [
            {
              id: editionId,
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
            },
          ],
        })),
        updateBook,
      },
      bookCovers: {
        uploadBookCover: vi.fn(async () => ({
          path: `${bookId}/cover.jpg`,
          publicUrl: 'https://storage.example.com/book-covers/cover.jpg',
        })),
        deleteBookCover,
      },
    });

    await applyMassMigration(plan, { services });

    expect(updateBook).toHaveBeenCalledTimes(1);
    expect(deleteBookCover).toHaveBeenCalledWith(
      'https://storage.example.com/book-covers/cover.jpg',
    );
    expect(plan.result.partial).toBe(1);
    expect(plan.rollbackPlan.resources.storagePaths).toContainEqual({
      path: `${bookId}/cover.jpg`,
      bucket: 'book-covers',
      candidateKey: 'book:uno',
      preexisting: false,
    });
    expect(plan.rollbackPlan.warnings).toContain(
      `Puede existir una portada huerfana tras fallo de persistencia: ${bookId}/cover.jpg`,
    );
  });

  it('blocks a pilot author whose target id no longer exists', async () => {
    const plan = createPlan(createPilotManifest());
    const services = createServices({
      authors: {
        getAuthorById: vi.fn(async () => {
          throw new Error('not found');
        }),
      },
    });

    await applyMassMigration(plan, { services });

    expect(plan.conflicts).toContainEqual(
      expect.objectContaining({
        code: 'PILOT_AUTHOR_NOT_FOUND',
        severity: 'error',
        candidateKey: 'author:1',
      }),
    );
    expect(plan.manifest.entries.find((entry) => entry.candidateKey === 'author:1')).toMatchObject({
      status: 'failed',
    });
    expect(services.books.createBook).not.toHaveBeenCalled();
  });

  it('blocks a pilot entity with incompatible slug', async () => {
    const plan = createPlan(createPilotManifest());
    const services = createServices({
      authors: {
        getAuthorById: vi.fn(async () => ({ id: authorId, slug: 'otro-slug' })),
      },
    });

    await applyMassMigration(plan, { services });

    expect(plan.conflicts).toContainEqual(
      expect.objectContaining({
        code: 'PILOT_ENTITY_MISMATCH',
        entityType: 'author',
        candidateKey: 'author:1',
      }),
    );
  });

  it('reconciles an existing pilot book when relations and editions are already present', async () => {
    const plan = createPlan(createPilotManifest());
    plan.authorImages = [];
    plan.bookCovers = [];
    const services = createServices();

    await applyMassMigration(plan, { services });

    expect(services.books.updateBook).not.toHaveBeenCalled();
    expect(
      plan.manifest.entries.find(
        (entry) => entry.entityType === 'relation' && entry.candidateKey === 'book:uno::author:1',
      ),
    ).toMatchObject({ status: 'applied', checkpoint: 'pilot_reconciled' });
    expect(
      plan.manifest.entries.find(
        (entry) => entry.entityType === 'edition' && entry.candidateKey === 'book:uno',
      ),
    ).toMatchObject({ status: 'applied', checkpoint: 'pilot_reconciled' });
  });

  it('repairs a pilot book with missing relation and missing edition through updateBook', async () => {
    const plan = createPlan(createPilotManifest());
    const updateBook = vi.fn(async () => ({
      id: bookId,
      slug: 'libro-uno',
      authors: [{ id: authorId, sortOrder: 0 }],
      editions: [
        {
          id: editionId,
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
        },
      ],
    }));
    const services = createServices({
      books: {
        getBookById: vi.fn(async () => ({
          id: bookId,
          slug: 'libro-uno',
          authors: [],
          editions: [],
        })),
        updateBook,
      },
    });

    await applyMassMigration(plan, { services });

    expect(updateBook).toHaveBeenCalledWith(bookId, {
      authorIds: [authorId],
      editions: [expect.objectContaining({ format: 'paperback' })],
    });
    expect(plan.result).toMatchObject({ relationsRepaired: 1, editionsRepaired: 1 });
  });

  it('resumes image DB update from uploaded_pending_db without uploading a second file', async () => {
    const plan = createPlan();
    const services = createServices();
    const imageEntry = plan.manifest.entries.find(
      (entry) => entry.entityType === 'book_cover' && entry.candidateKey === 'book:uno',
    );

    if (!imageEntry) {
      throw new Error('missing image entry');
    }

    imageEntry.status = 'partial';
    imageEntry.checkpoint = 'uploaded_pending_db';
    imageEntry.targetId = bookId;
    imageEntry.sourceMetadata = {
      path: `${bookId}/cover.jpg`,
      publicUrl: 'https://storage.example.com/book-covers/cover.jpg',
      createdByMassMigration: true,
    };
    plan.manifest.entries = plan.manifest.entries.map((entry) => {
      if (entry.entityType === 'author') {
        return { ...entry, status: 'applied', checkpoint: 'author_created', targetId: authorId };
      }

      if (entry.entityType === 'book') {
        return { ...entry, status: 'applied', checkpoint: 'book_created', targetId: bookId };
      }

      return entry;
    });

    await applyMassMigration(plan, { services });

    expect(services.bookCovers.uploadBookCover).not.toHaveBeenCalled();
    expect(services.books.updateBook).toHaveBeenCalledWith(bookId, {
      coverUrl: 'https://storage.example.com/book-covers/cover.jpg',
    });
    expect(imageEntry).toMatchObject({ status: 'applied', checkpoint: 'book_cover_uploaded' });
  });
});
