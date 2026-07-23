import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { assertPilotApplyEnvironment } from './env';
import type { ImageRepairPlan } from './image-repair';
import { downloadImage, type PilotApplyServices } from './apply';
import { writeJsonFileAtomically } from './output';
import type { PilotManifest, PilotManifestEntry } from './types';

type RepairDecisionAction = 'clear_wrong_book_cover' | 'set_author_photo' | 'manual_review';

interface RepairDecision {
  action: RepairDecisionAction;
  attachmentId?: string;
}

interface RepairDecisionsFile {
  decisions: Record<string, RepairDecision>;
  notes?: string[];
}

type RepairStatus =
  'planned' | 'applied' | 'partial' | 'skipped' | 'manual_action_required' | 'failed';

export interface ImageRepairResultEntry {
  candidateKey: string;
  action: RepairDecisionAction;
  targetId: string | null;
  status: RepairStatus;
  oldUrl: string | null;
  newUrl: string | null;
  storagePath: string | null;
  warnings: string[];
}

export interface ImageRepairResult {
  generatedAt: string;
  dryRun: boolean;
  summary: {
    clearWrongBookCover: number;
    setAuthorPhoto: number;
    manualReview: number;
    applied: number;
    skipped: number;
    partial: number;
    failed: number;
    manualActionRequired: number;
  };
  entries: ImageRepairResultEntry[];
}

export interface ImageRepairApplyOptions {
  outputDirectory: string;
  apply: boolean;
  confirm?: string;
  manifest: PilotManifest;
  repairPlan: ImageRepairPlan;
  services?: PilotApplyServices;
  skipEnvironmentCheck?: boolean;
}

function isImageTooLargeError(error: unknown) {
  return error instanceof Error && error.message === 'Image exceeds 5 MB';
}

async function readJsonFile<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readRepairDecisions(outputDirectory: string) {
  return readJsonFile<RepairDecisionsFile>(
    path.join(outputDirectory, 'image-repair-decisions.json'),
  );
}

async function readExistingRepairResult(
  outputDirectory: string,
): Promise<ImageRepairResult | null> {
  try {
    return await readJsonFile<ImageRepairResult>(
      path.join(outputDirectory, 'image-repair-result.json'),
    );
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

function getTargetId(manifest: PilotManifest, sourceType: 'author' | 'book', candidateKey: string) {
  const entry = getManifestEntry(manifest, sourceType, candidateKey);

  if (!entry?.targetId || (entry.status !== 'applied' && entry.status !== 'partial')) {
    return null;
  }

  return entry.targetId;
}

function getPilotCoverUrl(manifest: PilotManifest, candidateKey: string) {
  const imageEntry = getManifestEntry(manifest, 'image', candidateKey);
  const url = imageEntry?.sourceMetadata.resultingUrl;

  return typeof url === 'string' && url.length > 0 ? url : null;
}

function getPilotCoverPath(manifest: PilotManifest, candidateKey: string) {
  const imageEntry = getManifestEntry(manifest, 'image', candidateKey);

  return imageEntry?.targetId ?? null;
}

function getRepairEntry(repairPlan: ImageRepairPlan, candidateKey: string) {
  return repairPlan.entries.find((entry) => entry.candidateKey === candidateKey);
}

function getApprovedRepairUrl(
  repairPlan: ImageRepairPlan,
  candidateKey: string,
  decision: RepairDecision,
) {
  const repairEntry = getRepairEntry(repairPlan, candidateKey);

  if (!repairEntry?.proposedUrl) {
    return null;
  }

  if (decision.attachmentId && decision.attachmentId !== repairEntry.proposedAttachmentId) {
    return null;
  }

  return repairEntry.proposedUrl;
}

function getExistingAppliedRepair(
  existingResult: ImageRepairResult | null,
  candidateKey: string,
  action: RepairDecisionAction,
) {
  return existingResult?.entries.find(
    (entry) =>
      entry.candidateKey === candidateKey && entry.action === action && entry.status === 'applied',
  );
}

function createResultEntry(params: {
  candidateKey: string;
  action: RepairDecisionAction;
  targetId: string | null;
  status: RepairStatus;
  oldUrl?: string | null;
  newUrl?: string | null;
  storagePath?: string | null;
  warnings?: string[];
}): ImageRepairResultEntry {
  return {
    oldUrl: null,
    newUrl: null,
    storagePath: null,
    warnings: [],
    ...params,
  };
}

function summarize(entries: ImageRepairResultEntry[]) {
  return {
    clearWrongBookCover: entries.filter((entry) => entry.action === 'clear_wrong_book_cover')
      .length,
    setAuthorPhoto: entries.filter((entry) => entry.action === 'set_author_photo').length,
    manualReview: entries.filter((entry) => entry.action === 'manual_review').length,
    applied: entries.filter((entry) => entry.status === 'applied').length,
    skipped: entries.filter((entry) => entry.status === 'skipped').length,
    partial: entries.filter((entry) => entry.status === 'partial').length,
    failed: entries.filter((entry) => entry.status === 'failed').length,
    manualActionRequired: entries.filter((entry) => entry.status === 'manual_action_required')
      .length,
  };
}

function assertDecisionIsInManifest(
  manifest: PilotManifest,
  candidateKey: string,
  action: RepairDecisionAction,
) {
  const sourceType = action === 'clear_wrong_book_cover' ? 'book' : 'author';
  const entry = getManifestEntry(manifest, sourceType, candidateKey);

  if (!entry) {
    throw new Error(`Repair decision outside pilot manifest: ${candidateKey}`);
  }
}

function getDecisionEntries(decisionsFile: RepairDecisionsFile, manifest: PilotManifest) {
  const entries = Object.entries(decisionsFile.decisions);

  for (const [candidateKey, decision] of entries) {
    assertDecisionIsInManifest(manifest, candidateKey, decision.action);
  }

  return entries;
}

function createDryRunResult(
  decisionsFile: RepairDecisionsFile,
  manifest: PilotManifest,
  repairPlan: ImageRepairPlan,
) {
  const entries = getDecisionEntries(decisionsFile, manifest).map(([candidateKey, decision]) => {
    const targetId =
      decision.action === 'clear_wrong_book_cover'
        ? getTargetId(manifest, 'book', candidateKey)
        : getTargetId(manifest, 'author', candidateKey);
    const repairEntry = getRepairEntry(repairPlan, candidateKey);

    return createResultEntry({
      candidateKey,
      action: decision.action,
      targetId,
      status: decision.action === 'manual_review' ? 'manual_action_required' : 'planned',
      oldUrl:
        decision.action === 'clear_wrong_book_cover'
          ? getPilotCoverUrl(manifest, candidateKey)
          : null,
      newUrl: decision.action === 'set_author_photo' ? (repairEntry?.proposedUrl ?? null) : null,
      storagePath:
        decision.action === 'clear_wrong_book_cover'
          ? getPilotCoverPath(manifest, candidateKey)
          : null,
      warnings: targetId ? [] : [`No targetId found for ${candidateKey}`],
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    summary: summarize(entries),
    entries,
  };
}

async function clearWrongBookCover(params: {
  candidateKey: string;
  targetId: string;
  oldUrl: string | null;
  storagePath: string | null;
  services: PilotApplyServices;
}) {
  const warnings: string[] = [];

  await params.services.books.updateBook(params.targetId, { coverUrl: null });

  if (params.oldUrl && params.storagePath) {
    try {
      await params.services.bookCovers.deleteBookCover(params.oldUrl);
    } catch (error) {
      warnings.push(
        `Storage delete failed after DB cleanup: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  return createResultEntry({
    candidateKey: params.candidateKey,
    action: 'clear_wrong_book_cover',
    targetId: params.targetId,
    status: warnings.length > 0 ? 'partial' : 'applied',
    oldUrl: params.oldUrl,
    newUrl: null,
    storagePath: params.storagePath,
    warnings,
  });
}

async function setAuthorPhoto(params: {
  candidateKey: string;
  targetId: string;
  sourceUrl: string;
  services: PilotApplyServices;
}) {
  try {
    const { file } = await (params.services.downloadImage ?? downloadImage)(
      params.sourceUrl,
      params.candidateKey,
    );
    const uploaded = await params.services.authorImages.uploadAuthorImage(params.targetId, file);

    try {
      await params.services.authors.updateAuthor(params.targetId, {
        photoUrl: uploaded.publicUrl,
      });
    } catch (error) {
      try {
        await params.services.authorImages.deleteAuthorImage(uploaded.path);
      } catch (cleanupError) {
        console.error('[WordPressPilotRepair] Author image cleanup failed', {
          candidateKey: params.candidateKey,
          path: uploaded.path,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
        });
      }

      throw error;
    }

    return createResultEntry({
      candidateKey: params.candidateKey,
      action: 'set_author_photo',
      targetId: params.targetId,
      status: 'applied',
      oldUrl: null,
      newUrl: uploaded.publicUrl,
      storagePath: uploaded.path,
    });
  } catch (error) {
    if (isImageTooLargeError(error)) {
      return createResultEntry({
        candidateKey: params.candidateKey,
        action: 'set_author_photo',
        targetId: params.targetId,
        status: 'manual_action_required',
        oldUrl: null,
        newUrl: null,
        storagePath: null,
        warnings: ['Image exceeds 5 MB'],
      });
    }

    return createResultEntry({
      candidateKey: params.candidateKey,
      action: 'set_author_photo',
      targetId: params.targetId,
      status: 'failed',
      warnings: [error instanceof Error ? error.message : 'Unknown error'],
    });
  }
}

export async function runImageRepair(options: ImageRepairApplyOptions) {
  const decisionsFile = await readRepairDecisions(options.outputDirectory);

  if (!options.apply) {
    return createDryRunResult(decisionsFile, options.manifest, options.repairPlan);
  }

  if (options.confirm !== 'REPAIR') {
    throw new Error('Para reparar imagenes debes usar --apply --repair-images --confirm REPAIR.');
  }

  if (!options.services && !options.skipEnvironmentCheck) {
    assertPilotApplyEnvironment(process.env, {
      requireStorageCredentials: true,
    });
  }

  const existingResult = await readExistingRepairResult(options.outputDirectory);
  const services = options.services ?? (await getDefaultRepairServices());
  const entries: ImageRepairResultEntry[] = [];

  for (const [candidateKey, decision] of getDecisionEntries(decisionsFile, options.manifest)) {
    const existingAppliedRepair = getExistingAppliedRepair(
      existingResult,
      candidateKey,
      decision.action,
    );

    if (existingAppliedRepair) {
      entries.push({
        ...existingAppliedRepair,
        status: 'skipped',
        warnings: [...existingAppliedRepair.warnings, 'Repair already applied.'],
      });
      continue;
    }

    if (decision.action === 'manual_review') {
      entries.push(
        createResultEntry({
          candidateKey,
          action: decision.action,
          targetId: getTargetId(options.manifest, 'author', candidateKey),
          status: 'manual_action_required',
          warnings: ['Manual review requested by decisions file.'],
        }),
      );
      continue;
    }

    if (decision.action === 'clear_wrong_book_cover') {
      const targetId = getTargetId(options.manifest, 'book', candidateKey);

      if (!targetId) {
        entries.push(
          createResultEntry({
            candidateKey,
            action: decision.action,
            targetId: null,
            status: 'failed',
            warnings: ['Missing book targetId in pilot manifest.'],
          }),
        );
        continue;
      }

      entries.push(
        await clearWrongBookCover({
          candidateKey,
          targetId,
          oldUrl: getPilotCoverUrl(options.manifest, candidateKey),
          storagePath: getPilotCoverPath(options.manifest, candidateKey),
          services,
        }),
      );
      continue;
    }

    const targetId = getTargetId(options.manifest, 'author', candidateKey);
    const sourceUrl = getApprovedRepairUrl(options.repairPlan, candidateKey, decision);

    if (!targetId || !sourceUrl) {
      entries.push(
        createResultEntry({
          candidateKey,
          action: decision.action,
          targetId,
          status: 'failed',
          warnings: ['Missing author targetId or approved source image URL.'],
        }),
      );
      continue;
    }

    entries.push(
      await setAuthorPhoto({
        candidateKey,
        targetId,
        sourceUrl,
        services,
      }),
    );
  }

  const result: ImageRepairResult = {
    generatedAt: new Date().toISOString(),
    dryRun: false,
    summary: summarize(entries),
    entries,
  };

  await writeJsonFileAtomically(
    path.join(options.outputDirectory, 'image-repair-result.json'),
    result,
  );

  return result;
}
