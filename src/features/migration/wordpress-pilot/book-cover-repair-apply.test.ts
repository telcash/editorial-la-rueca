import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { runBookCoverRepair, type BookCoverRepairResult } from './book-cover-repair-apply';
import type { PilotApplyServices } from './apply';
import type { PilotAttachmentCandidate, PilotManifest, PilotManifestEntry } from './types';

const generatedAt = '2026-07-23T00:00:00.000Z';
const cruceTargetId = '9dc918df-8c99-473f-90be-a672fbc74803';

function createManifestEntry(
  overrides: Partial<PilotManifestEntry> & Pick<PilotManifestEntry, 'sourceType' | 'candidateKey'>,
): PilotManifestEntry {
  return {
    sourceWpPostId: '619',
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

function createManifest(): PilotManifest {
  return {
    generatedAt,
    auditSource: './migration/audit',
    entries: [
      createManifestEntry({
        sourceType: 'book',
        candidateKey: 'book:cruce de pasos',
        targetEntityType: 'books',
        targetId: cruceTargetId,
      }),
      createManifestEntry({
        sourceType: 'book',
        candidateKey: 'book:el valle de cristal',
        targetEntityType: 'books',
        targetId: 'el-valle-id',
      }),
      createManifestEntry({
        sourceType: 'book',
        candidateKey: 'book:requiem por un escritor desconocido',
        targetEntityType: 'books',
        targetId: 'requiem-id',
      }),
    ],
  };
}

function createAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '469',
    title: 'CRUCE DE PASOS 3a edicion CMYK',
    slug: 'w_cruce-de-pasos-3a-edicion-cmyk',
    url: 'https://editoriallarueca.com/wp-content/uploads/w_CRUCE-DE-PASOS-3a-edicion-CMYK.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '600',
    height: '900',
    attachedFile: 'w_CRUCE-DE-PASOS-3a-edicion-CMYK.jpg',
    ...overrides,
  };
}

function createServices(events: string[] = []): PilotApplyServices {
  return {
    authors: {
      getAuthorBySlug: vi.fn(),
      createAuthor: vi.fn(),
      updateAuthor: vi.fn(),
    },
    books: {
      getBookById: vi.fn(async () => {
        events.push('getBookById');

        return {
          id: cruceTargetId,
          coverUrl: null,
        };
      }),
      getBookBySlug: vi.fn(),
      createBook: vi.fn(),
      updateBook: vi.fn(async () => {
        events.push('updateBook');

        return {
          id: cruceTargetId,
          slug: 'cruce-de-pasos',
          editions: [],
        };
      }),
    },
    authorImages: {
      uploadAuthorImage: vi.fn(),
      deleteAuthorImage: vi.fn(),
    },
    bookCovers: {
      uploadBookCover: vi.fn(async () => {
        events.push('uploadBookCover');

        return {
          path: `${cruceTargetId}/cover.jpg`,
          publicUrl: `https://storage.example.com/book-covers/${cruceTargetId}/cover.jpg`,
        };
      }),
      deleteBookCover: vi.fn(async () => {
        events.push('deleteBookCover');
      }),
    },
    downloadImage: vi.fn(async () => {
      events.push('downloadImage');

      return {
        file: new File(['image'], 'cover.jpg', { type: 'image/jpeg' }),
        mimeType: 'image/jpeg' as const,
      };
    }),
  };
}

async function createOutputDirectory(
  decisions: { decisions: Record<string, unknown> } = createValidDecisions(),
) {
  const directory = await mkdtemp(path.join(tmpdir(), 'book-cover-repair-'));

  await writeFile(
    path.join(directory, 'book-cover-decisions.json'),
    `${JSON.stringify(decisions, null, 2)}\n`,
    'utf8',
  );

  return directory;
}

function createValidDecisions() {
  return {
    decisions: {
      'book:cruce de pasos': {
        action: 'set_book_cover',
        attachmentId: '469',
      },
    },
  };
}

async function writeExistingResult(directory: string, result: BookCoverRepairResult) {
  await writeFile(
    path.join(directory, 'book-cover-repair-result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
}

describe('runBookCoverRepair', () => {
  it('plans only Cruce de Pasos with attachment 469 in dry-run', async () => {
    const outputDirectory = await createOutputDirectory();

    const result = await runBookCoverRepair({
      outputDirectory,
      apply: false,
      manifest: createManifest(),
      attachments: [createAttachment()],
    });

    expect(result.summary.planned).toBe(1);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      candidateKey: 'book:cruce de pasos',
      targetId: cruceTargetId,
      attachmentId: '469',
      status: 'planned',
    });
    expect(result.noChange).toEqual([
      'book:el valle de cristal',
      'book:requiem por un escritor desconocido',
    ]);
  });

  it('requires attachment 469 to match the expected filename', async () => {
    const outputDirectory = await createOutputDirectory();

    await expect(
      runBookCoverRepair({
        outputDirectory,
        apply: false,
        manifest: createManifest(),
        attachments: [createAttachment({ attachedFile: 'wrong.jpg' })],
      }),
    ).rejects.toThrow('Attachment 469 mismatch');
  });

  it('requires the explicit Cruce de Pasos decision', async () => {
    const outputDirectory = await createOutputDirectory({
      decisions: {
        'book:el valle de cristal': {
          action: 'set_book_cover',
          attachmentId: '469',
        },
      },
    });

    await expect(
      runBookCoverRepair({
        outputDirectory,
        apply: false,
        manifest: createManifest(),
        attachments: [createAttachment()],
      }),
    ).rejects.toThrow('Decision de portada invalida');
  });

  it('uses the targetId from manifest and does not create a book', async () => {
    const services = createServices();
    const outputDirectory = await createOutputDirectory();

    await runBookCoverRepair({
      outputDirectory,
      apply: true,
      confirm: 'COVER_REPAIR',
      manifest: createManifest(),
      attachments: [createAttachment()],
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.books.getBookById).toHaveBeenCalledWith(cruceTargetId);
    expect(services.bookCovers.uploadBookCover).toHaveBeenCalledWith(
      cruceTargetId,
      expect.any(File),
    );
    expect(services.books.createBook).not.toHaveBeenCalled();
  });

  it('uploads a cover and updates only coverUrl', async () => {
    const services = createServices();
    const outputDirectory = await createOutputDirectory();

    const result = await runBookCoverRepair({
      outputDirectory,
      apply: true,
      confirm: 'COVER_REPAIR',
      manifest: createManifest(),
      attachments: [createAttachment()],
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.books.updateBook).toHaveBeenCalledWith(cruceTargetId, {
      coverUrl: `https://storage.example.com/book-covers/${cruceTargetId}/cover.jpg`,
    });
    expect(result.entries[0]?.status).toBe('applied');
  });

  it('cleans up the new uploaded file if coverUrl persistence fails', async () => {
    const events: string[] = [];
    const services = createServices(events);
    vi.mocked(services.books.updateBook).mockRejectedValueOnce(new Error('DB failed'));
    const outputDirectory = await createOutputDirectory();

    const result = await runBookCoverRepair({
      outputDirectory,
      apply: true,
      confirm: 'COVER_REPAIR',
      manifest: createManifest(),
      attachments: [createAttachment()],
      services,
      skipEnvironmentCheck: true,
    });

    expect(events).toEqual(['getBookById', 'downloadImage', 'uploadBookCover', 'deleteBookCover']);
    expect(services.bookCovers.deleteBookCover).toHaveBeenCalledWith(
      `https://storage.example.com/book-covers/${cruceTargetId}/cover.jpg`,
    );
    expect(result.entries[0]?.status).toBe('failed');
  });

  it('marks oversized downloads as manual action without changing coverUrl', async () => {
    const services = createServices();
    const downloadImage = services.downloadImage;

    if (!downloadImage) {
      throw new Error('Expected downloadImage test mock.');
    }

    vi.mocked(downloadImage).mockRejectedValueOnce(new Error('Image exceeds 5 MB'));
    const outputDirectory = await createOutputDirectory();

    const result = await runBookCoverRepair({
      outputDirectory,
      apply: true,
      confirm: 'COVER_REPAIR',
      manifest: createManifest(),
      attachments: [createAttachment()],
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.bookCovers.uploadBookCover).not.toHaveBeenCalled();
    expect(services.books.updateBook).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('manual_action_required');
  });

  it('skips an already applied repair without another upload', async () => {
    const services = createServices();
    vi.mocked(services.books.getBookById).mockResolvedValueOnce({
      id: cruceTargetId,
      coverUrl: `https://storage.example.com/book-covers/${cruceTargetId}/cover.jpg`,
    });
    const outputDirectory = await createOutputDirectory();
    await writeExistingResult(outputDirectory, {
      generatedAt,
      dryRun: false,
      summary: {
        planned: 0,
        applied: 1,
        skipped: 0,
        failed: 0,
        manualActionRequired: 0,
      },
      noChange: [],
      entries: [
        {
          candidateKey: 'book:cruce de pasos',
          targetId: cruceTargetId,
          attachmentId: '469',
          sourceUrl: createAttachment().url,
          storagePath: `${cruceTargetId}/cover.jpg`,
          oldCoverUrl: null,
          newCoverUrl: `https://storage.example.com/book-covers/${cruceTargetId}/cover.jpg`,
          status: 'applied',
          warnings: [],
        },
      ],
    });

    const result = await runBookCoverRepair({
      outputDirectory,
      apply: true,
      confirm: 'COVER_REPAIR',
      manifest: createManifest(),
      attachments: [createAttachment()],
      services,
      skipEnvironmentCheck: true,
    });

    expect(services.bookCovers.uploadBookCover).not.toHaveBeenCalled();
    expect(services.books.updateBook).not.toHaveBeenCalled();
    expect(result.entries[0]?.status).toBe('skipped');
  });
});
