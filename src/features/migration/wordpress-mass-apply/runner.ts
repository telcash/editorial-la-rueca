import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassRelationPlan,
} from '@/features/migration/wordpress-mass/types';
import type { PilotManifest } from '@/features/migration/wordpress-pilot/types';
import { planMassApply } from './planner';
import { runMassApplyPreflight } from './preflight';
import { writeMassApplyOutputs } from './output';

export interface MassMigrationOptions {
  massDirectory: string;
  dryRun: boolean;
  preflight: boolean;
  apply: boolean;
  confirm?: string;
  confirmBackup: boolean;
  resume: boolean;
  batchSize: number;
  limit?: number;
}

export async function runMassMigration(options: MassMigrationOptions) {
  if (options.apply && options.confirm !== 'MASS_MIGRATION') {
    throw new Error(
      'Para aplicar la migracion masiva debes usar --apply --confirm MASS_MIGRATION.',
    );
  }

  if (options.apply && !options.confirmBackup) {
    throw new Error(
      'Para aplicar la migracion masiva debes confirmar backup con --confirm-backup.',
    );
  }

  const massDirectory = path.resolve(options.massDirectory);
  const outputDirectory = path.join(massDirectory, 'apply');
  const [authors, books, relations, authorImages, bookCovers, pilotManifest] = await Promise.all([
    readJson<MassAuthorPlan[]>(path.join(massDirectory, 'mass-authors.json')),
    readJson<MassBookPlan[]>(path.join(massDirectory, 'mass-books.json')),
    readJson<MassRelationPlan[]>(path.join(massDirectory, 'mass-relations.json')),
    readJson<MassAuthorImagePlan[]>(path.join(massDirectory, 'mass-author-images.json')),
    readJson<MassBookCoverPlan[]>(path.join(massDirectory, 'mass-book-covers.json')),
    readOptionalJson<PilotManifest>(path.resolve(process.cwd(), 'migration/pilot/manifest.json')),
  ]);
  const mode = options.preflight ? 'preflight' : options.apply ? 'apply' : 'dry-run';
  const plan = planMassApply({
    mode,
    batchSize: options.batchSize,
    limit: options.limit,
    authors,
    books,
    relations,
    authorImages,
    bookCovers,
    pilotManifest,
  });

  if (options.preflight) {
    const preflightConflicts = await runMassApplyPreflight(plan);
    plan.conflicts.push(...preflightConflicts);
    plan.summary.blockers = plan.conflicts.filter(
      (conflict) => conflict.severity === 'error',
    ).length;
  }

  if (options.apply) {
    throw new Error(
      'Apply masivo preparado pero no ejecutado en este sprint. Ejecutar manualmente tras revisar dry-run/preflight.',
    );
  }

  const files = await writeMassApplyOutputs(plan, outputDirectory);

  return {
    plan,
    files,
    outputDirectory,
  };
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readOptionalJson<TData>(filePath: string): Promise<TData | null> {
  try {
    return await readJson<TData>(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}
