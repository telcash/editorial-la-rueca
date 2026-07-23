import { mkdir, open, readFile, rename } from 'node:fs/promises';
import path from 'node:path';

import type { ImageRepairPlan } from './image-repair';
import type { ImageReviewSummary } from './image-review';
import { renderImageReviewHtml } from './image-review';
import type { PilotManifest, PilotPlan, PilotResult } from './types';

export interface PilotRollbackPlan {
  generatedAt: string;
  authors: string[];
  books: string[];
  storageFiles: string[];
  notes: string[];
}

export async function writeJsonFileAtomically(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const fileHandle = await open(tempFilePath, 'w');

  try {
    await fileHandle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }

  await rename(tempFilePath, filePath);

  try {
    const directoryHandle = await open(path.dirname(filePath), 'r');

    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } catch {
    // Directory fsync is best-effort because support varies by platform/filesystem.
  }
}

export async function readExistingManifest(outputDirectory: string): Promise<PilotManifest | null> {
  try {
    const content = await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8');

    return JSON.parse(content) as PilotManifest;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export async function readExistingResult(outputDirectory: string): Promise<PilotResult | null> {
  try {
    const content = await readFile(path.join(outputDirectory, 'result.json'), 'utf8');

    return JSON.parse(content) as PilotResult;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

export function createInitialPilotResult(plan: PilotPlan): PilotResult {
  return {
    generatedAt: plan.generatedAt,
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
    skipped:
      plan.authors.filter((author) => author.status === 'skipped').length +
      plan.books.filter((book) => book.status === 'skipped').length +
      plan.relations.filter((relation) => relation.status === 'skipped').length +
      plan.editions.filter((edition) => edition.status === 'skipped').length +
      plan.images.filter((image) => image.status === 'skipped').length,
    partial: 0,
    failed:
      plan.authors.filter((author) => author.status === 'blocked').length +
      plan.books.filter((book) => book.status === 'blocked').length +
      plan.relations.filter((relation) => relation.status === 'blocked').length +
      plan.editions.filter((edition) => edition.status === 'blocked').length +
      plan.images.filter((image) => image.status === 'blocked').length,
    issues: plan.issues,
  };
}

export function createFailedPilotResult(plan: PilotPlan, error: unknown): PilotResult {
  return {
    ...createInitialPilotResult(plan),
    generatedAt: new Date().toISOString(),
    failed: createInitialPilotResult(plan).failed + 1,
    issues: [
      ...plan.issues,
      {
        severity: 'error',
        code: 'PILOT_APPLY_UNEXPECTED_ERROR',
        candidateKey: '',
        sourceWpPostId: '',
        message: 'El apply del piloto se interrumpio por un error inesperado.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    ],
  };
}

export function createRollbackPlan(plan: PilotPlan): PilotRollbackPlan {
  const appliedEntries = plan.manifest.entries.filter((entry) => entry.status === 'applied');

  return {
    generatedAt: plan.generatedAt,
    authors: appliedEntries
      .filter((entry) => entry.sourceType === 'author' && entry.targetId)
      .map((entry) => entry.targetId as string),
    books: appliedEntries
      .filter((entry) => entry.sourceType === 'book' && entry.targetId)
      .map((entry) => entry.targetId as string),
    storageFiles: appliedEntries
      .filter((entry) => entry.sourceType === 'image' && entry.targetId)
      .map((entry) => entry.targetId as string),
    notes: [
      appliedEntries.length === 0
        ? 'Dry-run: no se han creado registros ni archivos.'
        : 'Apply: revisar manualmente estos IDs y paths antes de borrar datos.',
      'La reversión es manual y debe revisarse antes de borrar datos.',
    ],
  };
}

export async function writePilotOutputs(
  outputDirectory: string,
  plan: PilotPlan,
  result?: PilotResult,
  imageRepairPlan?: ImageRepairPlan,
  imageReviewSummary?: ImageReviewSummary,
) {
  await mkdir(outputDirectory, { recursive: true });

  const writes = [
    writeJsonFileAtomically(path.join(outputDirectory, 'plan.json'), plan),
    writeJsonFileAtomically(path.join(outputDirectory, 'authors.json'), plan.authors),
    writeJsonFileAtomically(path.join(outputDirectory, 'books.json'), plan.books),
    writeJsonFileAtomically(path.join(outputDirectory, 'relations.json'), plan.relations),
    writeJsonFileAtomically(path.join(outputDirectory, 'editions.json'), plan.editions),
    writeJsonFileAtomically(path.join(outputDirectory, 'images.json'), plan.images),
    writeJsonFileAtomically(path.join(outputDirectory, 'issues.json'), plan.issues),
    writeJsonFileAtomically(path.join(outputDirectory, 'manifest.json'), plan.manifest),
    writeJsonFileAtomically(
      path.join(outputDirectory, 'rollback-plan.json'),
      createRollbackPlan(plan),
    ),
    writeJsonFileAtomically(
      path.join(outputDirectory, 'result.json'),
      result ?? createInitialPilotResult(plan),
    ),
  ];

  if (imageRepairPlan) {
    writes.push(
      writeJsonFileAtomically(
        path.join(outputDirectory, 'image-repair-plan.json'),
        imageRepairPlan,
      ),
      writeImageRepairDecisionsTemplate(outputDirectory),
    );
  }

  if (imageReviewSummary) {
    writes.push(
      writeJsonFileAtomically(
        path.join(outputDirectory, 'image-review-summary.json'),
        imageReviewSummary,
      ),
      writeTextFileAtomically(
        path.join(outputDirectory, 'image-review.html'),
        renderImageReviewHtml(imageReviewSummary),
      ),
    );
  }

  await Promise.all(writes);
}

async function writeTextFileAtomically(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true });

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const fileHandle = await open(tempFilePath, 'w');

  try {
    await fileHandle.writeFile(content, 'utf8');
    await fileHandle.sync();
  } finally {
    await fileHandle.close();
  }

  await rename(tempFilePath, filePath);
}

async function writeImageRepairDecisionsTemplate(outputDirectory: string) {
  const filePath = path.join(outputDirectory, 'image-repair-decisions.json');

  try {
    await open(filePath, 'r').then((fileHandle) => fileHandle.close());
    return;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }

  await writeJsonFileAtomically(filePath, {
    decisions: {},
    notes: [
      'Rellenar manualmente antes de cualquier reparacion real.',
      'No se ejecuta automaticamente desde el dry-run.',
    ],
  });
}

export interface PilotCheckpointWriter {
  persist(plan: PilotPlan, result: PilotResult): Promise<void>;
}

export function createPilotCheckpointWriter(outputDirectory: string): PilotCheckpointWriter {
  return {
    async persist(plan: PilotPlan, result: PilotResult) {
      await mkdir(outputDirectory, { recursive: true });
      await writeJsonFileAtomically(path.join(outputDirectory, 'manifest.json'), plan.manifest);
      await writeJsonFileAtomically(
        path.join(outputDirectory, 'rollback-plan.json'),
        createRollbackPlan(plan),
      );
      await writeJsonFileAtomically(path.join(outputDirectory, 'result.json'), result);
    },
  };
}
