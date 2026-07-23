import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { downloadImage, type PilotApplyServices } from './apply';
import { assertPilotApplyEnvironment } from './env';
import { writeJsonFileAtomically } from './output';
import type { PilotAttachmentCandidate, PilotManifest, PilotManifestEntry } from './types';

const decisionCandidateKey = 'book:cruce de pasos';
const decisionAttachmentId = '469';
const decisionAction = 'set_book_cover';
const decisionFilename = 'w_CRUCE-DE-PASOS-3a-edicion-CMYK.jpg';
const resultFilename = 'book-cover-repair-result.json';

type BookCoverRepairStatus =
  'planned' | 'applied' | 'skipped' | 'manual_action_required' | 'failed';

interface BookCoverDecision {
  action: typeof decisionAction;
  attachmentId: typeof decisionAttachmentId;
}

interface BookCoverDecisionsFile {
  decisions: Record<string, BookCoverDecision>;
  notes?: string[];
}

export interface BookCoverRepairResultEntry {
  candidateKey: string;
  targetId: string | null;
  attachmentId: string;
  sourceUrl: string | null;
  storagePath: string | null;
  oldCoverUrl: string | null;
  newCoverUrl: string | null;
  status: BookCoverRepairStatus;
  warnings: string[];
}

export interface BookCoverRepairResult {
  generatedAt: string;
  dryRun: boolean;
  summary: {
    planned: number;
    applied: number;
    skipped: number;
    failed: number;
    manualActionRequired: number;
  };
  entries: BookCoverRepairResultEntry[];
  noChange: string[];
}

export interface BookCoverRepairApplyOptions {
  outputDirectory: string;
  apply: boolean;
  confirm?: string;
  manifest: PilotManifest;
  attachments: PilotAttachmentCandidate[];
  services?: PilotApplyServices;
  skipEnvironmentCheck?: boolean;
}

async function readJsonFile<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readBookCoverDecisions(outputDirectory: string) {
  return readJsonFile<BookCoverDecisionsFile>(
    path.join(outputDirectory, 'book-cover-decisions.json'),
  );
}

async function readExistingRepairResult(
  outputDirectory: string,
): Promise<BookCoverRepairResult | null> {
  try {
    return await readJsonFile<BookCoverRepairResult>(path.join(outputDirectory, resultFilename));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function getDefaultRepairServices(): Promise<PilotApplyServices> {
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

function getManifestEntry(
  manifest: PilotManifest,
  sourceType: PilotManifestEntry['sourceType'],
  candidateKey: string,
) {
  return manifest.entries.find(
    (entry) => entry.sourceType === sourceType && entry.candidateKey === candidateKey,
  );
}

function getBookTargetId(manifest: PilotManifest) {
  const entry = getManifestEntry(manifest, 'book', decisionCandidateKey);

  if (!entry?.targetId || (entry.status !== 'applied' && entry.status !== 'partial')) {
    return null;
  }

  return entry.targetId;
}

function getAttachment(attachments: PilotAttachmentCandidate[]) {
  const attachment = attachments.find((item) => item.wpPostId === decisionAttachmentId);

  if (!attachment) {
    throw new Error('Attachment 469 no existe en attachments-candidates.csv.');
  }

  if (attachment.attachedFile !== decisionFilename) {
    throw new Error(
      `Attachment 469 mismatch: expected ${decisionFilename}, got ${attachment.attachedFile}.`,
    );
  }

  if (attachment.mimeType !== 'image/jpeg') {
    throw new Error(
      `Attachment 469 MIME mismatch: expected image/jpeg, got ${attachment.mimeType}.`,
    );
  }

  if (!attachment.url || !attachment.width || !attachment.height) {
    throw new Error('Attachment 469 no tiene URL o dimensiones suficientes.');
  }

  return attachment;
}

function assertSingleDecision(decisionsFile: BookCoverDecisionsFile) {
  const entries = Object.entries(decisionsFile.decisions);

  if (entries.length !== 1) {
    throw new Error('book-cover-decisions.json debe contener exactamente una decision.');
  }

  const [entry] = entries;

  if (!entry) {
    throw new Error('book-cover-decisions.json no contiene decisiones.');
  }

  const [candidateKey, decision] = entry;

  if (
    candidateKey !== decisionCandidateKey ||
    decision.action !== decisionAction ||
    decision.attachmentId !== decisionAttachmentId
  ) {
    throw new Error(
      'Decision de portada invalida: solo se permite Cruce de Pasos con attachment 469.',
    );
  }
}

function isImageTooLargeError(error: unknown) {
  return error instanceof Error && error.message === 'Image exceeds 5 MB';
}

function summarize(entries: BookCoverRepairResultEntry[]) {
  return {
    planned: entries.filter((entry) => entry.status === 'planned').length,
    applied: entries.filter((entry) => entry.status === 'applied').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    manualActionRequired: entries.filter((entry) => entry.status === 'manual_action_required')
      .length,
  };
}

function createResult(entry: BookCoverRepairResultEntry, dryRun: boolean): BookCoverRepairResult {
  return {
    generatedAt: new Date().toISOString(),
    dryRun,
    summary: summarize([entry]),
    entries: [entry],
    noChange: ['book:el valle de cristal', 'book:requiem por un escritor desconocido'],
  };
}

function createDryRunResult(targetId: string | null, attachment: PilotAttachmentCandidate) {
  return createResult(
    {
      candidateKey: decisionCandidateKey,
      targetId,
      attachmentId: decisionAttachmentId,
      sourceUrl: attachment.url,
      storagePath: null,
      oldCoverUrl: null,
      newCoverUrl: null,
      status: 'planned',
      warnings: targetId ? [] : ['No targetId found for book:cruce de pasos.'],
    },
    true,
  );
}

function getAppliedResult(existingResult: BookCoverRepairResult | null) {
  return existingResult?.entries.find(
    (entry) =>
      entry.candidateKey === decisionCandidateKey &&
      entry.attachmentId === decisionAttachmentId &&
      entry.status === 'applied' &&
      entry.newCoverUrl,
  );
}

export async function runBookCoverRepair(options: BookCoverRepairApplyOptions) {
  const decisionsFile = await readBookCoverDecisions(options.outputDirectory);
  assertSingleDecision(decisionsFile);

  const targetId = getBookTargetId(options.manifest);
  const attachment = getAttachment(options.attachments);

  if (!options.apply) {
    return createDryRunResult(targetId, attachment);
  }

  if (options.confirm !== 'COVER_REPAIR') {
    throw new Error(
      'Para reparar portadas debes usar --apply --repair-book-covers --confirm COVER_REPAIR.',
    );
  }

  if (!options.services && !options.skipEnvironmentCheck) {
    assertPilotApplyEnvironment(process.env, {
      requireStorageCredentials: true,
    });
  }

  const existingResult = await readExistingRepairResult(options.outputDirectory);
  const existingAppliedResult = getAppliedResult(existingResult);
  const services = options.services ?? (await getDefaultRepairServices());

  if (!targetId) {
    const result = createResult(
      {
        candidateKey: decisionCandidateKey,
        targetId: null,
        attachmentId: decisionAttachmentId,
        sourceUrl: attachment.url,
        storagePath: null,
        oldCoverUrl: null,
        newCoverUrl: null,
        status: 'failed',
        warnings: ['Missing book targetId in pilot manifest.'],
      },
      false,
    );
    await writeJsonFileAtomically(path.join(options.outputDirectory, resultFilename), result);

    return result;
  }

  const currentBook = await services.books.getBookById(targetId);

  if (existingAppliedResult && currentBook.coverUrl === existingAppliedResult.newCoverUrl) {
    const result = createResult(
      {
        ...existingAppliedResult,
        status: 'skipped',
        warnings: [...existingAppliedResult.warnings, 'Book cover repair already applied.'],
      },
      false,
    );
    await writeJsonFileAtomically(path.join(options.outputDirectory, resultFilename), result);

    return result;
  }

  try {
    const { file } = await (services.downloadImage ?? downloadImage)(
      attachment.url,
      decisionCandidateKey,
    );
    const uploaded = await services.bookCovers.uploadBookCover(targetId, file);

    try {
      await services.books.updateBook(targetId, {
        coverUrl: uploaded.publicUrl,
      });
    } catch (error) {
      try {
        await services.bookCovers.deleteBookCover(uploaded.publicUrl);
      } catch (cleanupError) {
        console.error('[WordPressPilotBookCoverRepair] Book cover cleanup failed', {
          candidateKey: decisionCandidateKey,
          path: uploaded.path,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
        });
      }

      throw error;
    }

    const result = createResult(
      {
        candidateKey: decisionCandidateKey,
        targetId,
        attachmentId: decisionAttachmentId,
        sourceUrl: attachment.url,
        storagePath: uploaded.path,
        oldCoverUrl: currentBook.coverUrl,
        newCoverUrl: uploaded.publicUrl,
        status: 'applied',
        warnings: [],
      },
      false,
    );
    await writeJsonFileAtomically(path.join(options.outputDirectory, resultFilename), result);

    return result;
  } catch (error) {
    const result = createResult(
      {
        candidateKey: decisionCandidateKey,
        targetId,
        attachmentId: decisionAttachmentId,
        sourceUrl: attachment.url,
        storagePath: null,
        oldCoverUrl: currentBook.coverUrl,
        newCoverUrl: null,
        status: isImageTooLargeError(error) ? 'manual_action_required' : 'failed',
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
      },
      false,
    );
    await writeJsonFileAtomically(path.join(options.outputDirectory, resultFilename), result);

    return result;
  }
}
