import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runImageRepair, type ImageRepairResult } from './image-repair-apply';
import type { ImageRepairPlan } from './image-repair';
import type { PilotApplyServices } from './apply';
import type { PilotManifest, PilotManifestEntry } from './types';

const generatedAt = '2026-07-23T00:00:00.000Z';

function createManifestEntry(
  overrides: Partial<PilotManifestEntry> & Pick<PilotManifestEntry, 'sourceType' | 'candidateKey'>,
): PilotManifestEntry {
  return {
    sourceWpPostId: '1',
    targetEntityType: overrides.sourceType,
    targetId: null,
    status: 'applied',
    warnings: [],
    sourceMetadata: {},
    imageStatus: '',
    createdAt: generatedAt,
    ...overrides,
  };
}

function createManifest(entries: PilotManifestEntry[]): PilotManifest {
  return {
    generatedAt,
    auditSource: './migration/audit',
    entries,
  };
}

function createBookManifestEntries(candidateKey: string, targetId: string) {
  return [
    createManifestEntry({
      sourceType: 'book',
      candidateKey,
      targetEntityType: 'books',
      targetId,
    }),
    createManifestEntry({
      sourceType: 'image',
      candidateKey,
      targetEntityType: 'book_covers',
      targetId: `${targetId}/cover.jpg`,
      sourceMetadata: {
        resultingUrl: `https://storage.example.com/book-covers/${targetId}/cover.jpg`,
        role: 'safe_book_cover',
      },
    }),
  ];
}

function createAuthorManifestEntry(candidateKey: string, targetId: string) {
  return createManifestEntry({
    sourceType: 'author',
    candidateKey,
    targetEntityType: 'authors',
    targetId,
  });
}

function createRepairPlan(entries: ImageRepairPlan['entries']): ImageRepairPlan {
  return {
    generatedAt,
    summary: {
      thumbnailId: {
        totalWithField: 0,
        distinctFromThumbnail: 0,
        authorPhotoSignals: 0,
        bookCoverSignals: 0,
        mixedSignals: 0,
        conclusion: 'MIXED_USAGE',
      },
      imageFieldId: {
        totalWithField: 0,
        distinctFromThumbnail: 0,
        authorPhotoSignals: 0,
        bookCoverSignals: 0,
        mixedSignals: 0,
        conclusion: 'MIXED_USAGE',
      },
      highConfidence: 0,
      manualReview: 0,
      notes: [],
    },
    entries,
  };
}

function createRepairPlanEntry(
  candidateKey: string,
  proposedAttachmentId: string,
  proposedUrl: string,
): ImageRepairPlan['entries'][number] {
  return {
    candidateKey,
    sourceWpPostId: candidateKey.split(':')[1] ?? '',
    entityType: 'author',
    currentUrl: null,
    currentRole: 'none',
    thumbnail: {
      attachmentId: proposedAttachmentId,
      url: proposedUrl,
      filename: 'foto.jpg',
      title: 'Foto',
      alt: null,
      meta: null,
      width: 600,
      height: 600,
      parentId: null,
      filenameSignal: 'author_photo',
      aspectRatioSignal: 'square',
    },
    imageField: {
      attachmentId: null,
      url: null,
      filename: null,
      title: null,
      alt: null,
      meta: null,
      width: null,
      height: null,
      parentId: null,
      filenameSignal: 'unknown',
      aspectRatioSignal: 'unknown',
    },
    proposedAttachmentId,
    proposedUrl,
    proposedRole: 'author_photo',
    confidence: 'high',
    reasons: ['fixture'],
    action: 'set_author_photo',
  };
}

function createServices(events: string[] = []): PilotApplyServices {
  const createAuthor = vi.fn();
  const createBook = vi.fn();

  return {
    authors: {
      getAuthorBySlug: vi.fn(),
      createAuthor,
      updateAuthor: vi.fn(async () => {
        events.push('updateAuthor');

        return {
          id: 'author-id',
          slug: 'author-slug',
        };
      }),
    },
    books: {
      getBookBySlug: vi.fn(),
      createBook,
      updateBook: vi.fn(async () => {
        events.push('updateBook');

        return {
          id: 'book-id',
          slug: 'book-slug',
          editions: [],
        };
      }),
    },
    authorImages: {
      uploadAuthorImage: vi.fn(async () => {
        events.push('uploadAuthorImage');

        return {
          path: 'author-id/photo.jpg',
          publicUrl: 'https://storage.example.com/authors/author-id/photo.jpg',
        };
      }),
      deleteAuthorImage: vi.fn(async () => {
        events.push('deleteAuthorImage');
      }),
    },
    bookCovers: {
      uploadBookCover: vi.fn(async () => {
        events.push('uploadBookCover');

        return {
          path: 'book-id/cover.jpg',
          publicUrl: 'https://storage.example.com/book-covers/book-id/cover.jpg',
        };
      }),
      deleteBookCover: vi.fn(async () => {
        events.push('deleteBookCover');
      }),
    },
    downloadImage: vi.fn(async () => {
      events.push('downloadImage');

      return {
        file: new File(['image'], 'image.jpg', { type: 'image/jpeg' }),
        mimeType: 'image/jpeg' as const,
      };
    }),
  };
}

async function createOutputDirectory(decisions: Record<string, unknown>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'image-repair-'));

  await writeFile(
    path.join(directory, 'image-repair-decisions.json'),
    `${JSON.stringify({ decisions }, null, 2)}\n`,
    'utf8',
  );

  return directory;
}

async function writeExistingRepairResult(directory: string, result: ImageRepairResult) {
  await writeFile(
    path.join(directory, 'image-repair-result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
}

describe('runImageRepair', () => {
  it('previews the approved controlled repair counts without applying changes', async () => {
    const decisions = {
      'book:requiem por un escritor desconocido': { action: 'clear_wrong_book_cover' },
      'book:cruce de pasos': { action: 'clear_wrong_book_cover' },
      'book:el valle de cristal': { action: 'clear_wrong_book_cover' },
      'author:563': { action: 'set_author_photo', attachmentId: '617' },
      'author:589': { action: 'set_author_photo', attachmentId: '591' },
      'author:619': { action: 'set_author_photo', attachmentId: '621' },
      'author:990': { action: 'set_author_photo', attachmentId: '992' },
      'author:1108': { action: 'set_author_photo', attachmentId: '1110' },
      'author:1712': { action: 'set_author_photo', attachmentId: '1714' },
      'author:556': { action: 'manual_review' },
      'author:571': { action: 'manual_review' },
    };
    const outputDirectory = await createOutputDirectory(decisions);
    const manifest = createManifest([
      ...createBookManifestEntries('book:requiem por un escritor desconocido', 'book-1'),
      ...createBookManifestEntries('book:cruce de pasos', 'book-2'),
      ...createBookManifestEntries('book:el valle de cristal', 'book-3'),
      createAuthorManifestEntry('author:563', 'author-563'),
      createAuthorManifestEntry('author:589', 'author-589'),
      createAuthorManifestEntry('author:619', 'author-619'),
      createAuthorManifestEntry('author:990', 'author-990'),
      createAuthorManifestEntry('author:1108', 'author-1108'),
      createAuthorManifestEntry('author:1712', 'author-1712'),
      createAuthorManifestEntry('author:556', 'author-556'),
      createAuthorManifestEntry('author:571', 'author-571'),
    ]);
    const repairPlan = createRepairPlan([
      createRepairPlanEntry('author:563', '617', 'https://wp.example.com/fotoAna.jpg'),
      createRepairPlanEntry('author:589', '591', 'https://wp.example.com/FotoCharlin.jpg'),
      createRepairPlanEntry('author:619', '621', 'https://wp.example.com/FotoAngel.jpg'),
      createRepairPlanEntry('author:990', '992', 'https://wp.example.com/w_FotoJeronimo.jpg'),
      createRepairPlanEntry('author:1108', '1110', 'https://wp.example.com/w_FOTO-MAURO.jpg'),
      createRepairPlanEntry('author:1712', '1714', 'https://wp.example.com/foto1.jpg'),
    ]);

    const result = await runImageRepair({
      outputDirectory,
      apply: false,
      manifest,
      repairPlan,
    });

    expect(result.summary.clearWrongBookCover).toBe(3);
    expect(result.summary.setAuthorPhoto).toBe(6);
    expect(result.summary.manualReview).toBe(2);
    expect(result.summary.applied).toBe(0);
  });

  it('clears a wrong book cover in the database before deleting the pilot storage file', async () => {
    const events: string[] = [];
    const services = createServices(events);
    const outputDirectory = await createOutputDirectory({
      'book:cruce de pasos': { action: 'clear_wrong_book_cover' },
    });
    const manifest = createManifest(createBookManifestEntries('book:cruce de pasos', 'book-2'));

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest,
      repairPlan: createRepairPlan([]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(events).toEqual(['updateBook', 'deleteBookCover']);
    expect(services.books.updateBook).toHaveBeenCalledWith('book-2', { coverUrl: null });
    expect(services.bookCovers.deleteBookCover).toHaveBeenCalledWith(
      'https://storage.example.com/book-covers/book-2/cover.jpg',
    );
    expect(services.books.createBook).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('applied');
  });

  it('keeps the database cleanup when deleting the old book cover from storage fails', async () => {
    const services = createServices();
    vi.mocked(services.bookCovers.deleteBookCover).mockRejectedValueOnce(new Error('Storage down'));
    const outputDirectory = await createOutputDirectory({
      'book:el valle de cristal': { action: 'clear_wrong_book_cover' },
    });
    const manifest = createManifest(
      createBookManifestEntries('book:el valle de cristal', 'book-3'),
    );

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest,
      repairPlan: createRepairPlan([]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.books.updateBook).toHaveBeenCalledWith('book-3', { coverUrl: null });
    expect(result.entries[0]?.status).toBe('partial');
    expect(result.entries[0]?.warnings[0]).toContain('Storage delete failed');
  });

  it('sets an author photo using the manifest target id and the approved WordPress URL', async () => {
    const services = createServices();
    const outputDirectory = await createOutputDirectory({
      'author:563': { action: 'set_author_photo', attachmentId: '617' },
    });

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest: createManifest([createAuthorManifestEntry('author:563', 'author-563')]),
      repairPlan: createRepairPlan([
        createRepairPlanEntry('author:563', '617', 'https://wp.example.com/fotoAna.jpg'),
      ]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).toHaveBeenCalledWith(
      'https://wp.example.com/fotoAna.jpg',
      'author:563',
    );
    expect(services.authorImages.uploadAuthorImage).toHaveBeenCalledWith(
      'author-563',
      expect.any(File),
    );
    expect(services.authors.updateAuthor).toHaveBeenCalledWith('author-563', {
      photoUrl: 'https://storage.example.com/authors/author-id/photo.jpg',
    });
    expect(services.authors.createAuthor).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('applied');
  });

  it('marks oversized author images as manual action without uploading', async () => {
    const services = createServices();
    const downloadImage = services.downloadImage;

    if (!downloadImage) {
      throw new Error('Expected downloadImage test mock.');
    }

    vi.mocked(downloadImage).mockRejectedValueOnce(new Error('Image exceeds 5 MB'));
    const outputDirectory = await createOutputDirectory({
      'author:571': { action: 'set_author_photo', attachmentId: '573' },
    });

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest: createManifest([createAuthorManifestEntry('author:571', 'author-571')]),
      repairPlan: createRepairPlan([
        createRepairPlanEntry('author:571', '573', 'https://wp.example.com/large.jpg'),
      ]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
    expect(services.authors.updateAuthor).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('manual_action_required');
  });

  it('leaves manual review authors untouched', async () => {
    const services = createServices();
    const outputDirectory = await createOutputDirectory({
      'author:556': { action: 'manual_review' },
      'author:571': { action: 'manual_review' },
    });

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest: createManifest([
        createAuthorManifestEntry('author:556', 'author-556'),
        createAuthorManifestEntry('author:571', 'author-571'),
      ]),
      repairPlan: createRepairPlan([]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
    expect(services.authors.updateAuthor).not.toHaveBeenCalled();
    expect(result.summary.manualActionRequired).toBe(2);
  });

  it('does not duplicate an already applied author photo repair', async () => {
    const services = createServices();
    const outputDirectory = await createOutputDirectory({
      'author:563': { action: 'set_author_photo', attachmentId: '617' },
    });
    await writeExistingRepairResult(outputDirectory, {
      generatedAt,
      dryRun: false,
      summary: {
        clearWrongBookCover: 0,
        setAuthorPhoto: 1,
        manualReview: 0,
        applied: 1,
        skipped: 0,
        partial: 0,
        failed: 0,
        manualActionRequired: 0,
      },
      entries: [
        {
          candidateKey: 'author:563',
          action: 'set_author_photo',
          targetId: 'author-563',
          status: 'applied',
          oldUrl: null,
          newUrl: 'https://storage.example.com/authors/author-563/photo.jpg',
          storagePath: 'author-563/photo.jpg',
          warnings: [],
        },
      ],
    });

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest: createManifest([createAuthorManifestEntry('author:563', 'author-563')]),
      repairPlan: createRepairPlan([
        createRepairPlanEntry('author:563', '617', 'https://wp.example.com/fotoAna.jpg'),
      ]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.downloadImage).not.toHaveBeenCalled();
    expect(services.authorImages.uploadAuthorImage).not.toHaveBeenCalled();
    expect(services.authors.updateAuthor).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('skipped');
  });

  it('blocks repair decisions outside the pilot manifest', async () => {
    const outputDirectory = await createOutputDirectory({
      'author:999': { action: 'set_author_photo', attachmentId: '1001' },
    });

    await expect(
      runImageRepair({
        outputDirectory,
        apply: false,
        manifest: createManifest([]),
        repairPlan: createRepairPlan([]),
      }),
    ).rejects.toThrow('Repair decision outside pilot manifest: author:999');
  });

  it('cleans up a newly uploaded author image if persisting photoUrl fails', async () => {
    const events: string[] = [];
    const services = createServices(events);
    vi.mocked(services.authors.updateAuthor).mockRejectedValueOnce(new Error('DB failed'));
    const outputDirectory = await createOutputDirectory({
      'author:563': { action: 'set_author_photo', attachmentId: '617' },
    });

    const result = await runImageRepair({
      outputDirectory,
      apply: true,
      confirm: 'REPAIR',
      manifest: createManifest([createAuthorManifestEntry('author:563', 'author-563')]),
      repairPlan: createRepairPlan([
        createRepairPlanEntry('author:563', '617', 'https://wp.example.com/fotoAna.jpg'),
      ]),
      services,
      skipEnvironmentCheck: true,
    });

    expect(events).toEqual(['downloadImage', 'uploadAuthorImage', 'deleteAuthorImage']);
    expect(services.authorImages.deleteAuthorImage).toHaveBeenCalledWith('author-id/photo.jpg');
    expect(result.entries[0]?.status).toBe('failed');
    expect(result.entries[0]?.warnings[0]).toBe('DB failed');
  });
});
