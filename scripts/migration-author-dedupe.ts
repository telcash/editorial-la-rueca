import path from 'node:path';

import { loadEnvConfig } from '@next/env';

interface CliArgs {
  outputDirectory: string;
  finalReview: boolean;
  dryRun: boolean;
  preflight: boolean;
  apply: boolean;
  resume: boolean;
  confirm?: string;
  batchSize: number;
}

async function main() {
  loadEnvConfig(process.cwd());

  try {
    const args = parseArgs(process.argv.slice(2));
    const {
      runPostMigrationAuthorDedupeApply,
      runPostMigrationAuthorDedupeAudit,
      runPostMigrationAuthorDedupeFinalReview,
    } = await import('@/features/migration/post-migration-author-dedupe/runner');

    if (args.finalReview) {
      const result = await runPostMigrationAuthorDedupeFinalReview({
        outputDirectory: args.outputDirectory,
      });

      console.log('Post-migration author dedupe final review completed.');
      console.log(`Output: ${path.relative(process.cwd(), path.resolve(result.outputDirectory))}`);
      console.log(`Groups: ${result.review.statistics.totalGroups}`);
      console.log(`Proposal only: ${result.review.statistics.proposalOnly}`);
      console.log(`Photo conflicts: ${result.review.statistics.photoConflicts}`);
      console.log(`Biography conflicts: ${result.review.statistics.biographyConflicts}`);
      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      return;
    }

    if (args.dryRun || args.preflight || args.apply) {
      const mode = args.apply ? 'apply' : args.preflight ? 'preflight' : 'dry-run';
      const result = await runPostMigrationAuthorDedupeApply({
        outputDirectory: args.outputDirectory,
        mode,
        confirm: args.confirm,
        resume: args.resume,
        batchSize: args.batchSize,
      });

      console.log(`Post-migration author dedupe ${mode} completed.`);
      console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
      console.log(`Grupos aprobados: ${result.plan.summary.approvedGroups}`);
      console.log(`Autores canonicos: ${result.plan.summary.canonicalAuthors}`);
      console.log(
        `Autores duplicados a archivar: ${result.plan.summary.duplicateAuthorsToArchive}`,
      );
      console.log(`Relaciones a mover: ${result.plan.summary.relationsToMove}`);
      console.log(
        `Relaciones duplicadas a evitar: ${result.plan.summary.duplicateRelationsToAvoid}`,
      );
      console.log(`Conflictos: ${result.plan.summary.conflicts}`);
      console.log(`Blockers: ${result.plan.summary.blockers}`);
      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      if (args.apply && result.plan.summary.blockers > 0) {
        throw new Error('Apply bloqueado por conflictos de preflight.');
      }

      return;
    }

    const result = await runPostMigrationAuthorDedupeAudit({
      outputDirectory: args.outputDirectory,
    });

    console.log('Post-migration author duplicate audit completed.');
    console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
    console.log(`Total authors: ${result.audit.summary.totalAuthors}`);
    console.log(`Duplicate groups: ${result.audit.summary.duplicateGroupsDetected}`);
    console.log(`Affected authors: ${result.audit.summary.affectedAuthors}`);
    console.log(`Affected books: ${result.audit.summary.affectedBooks}`);
    console.log(`HIGH_CONFIDENCE_DUPLICATE: ${result.audit.summary.highConfidenceDuplicate}`);
    console.log(`LIKELY_DUPLICATE: ${result.audit.summary.likelyDuplicate}`);
    console.log(`MANUAL_REVIEW: ${result.audit.summary.manualReview}`);
    console.log(`KEEP_SEPARATE: ${result.audit.summary.keepSeparate}`);
    console.log('Generated files:');

    for (const file of result.files) {
      console.log(`- ${path.relative(process.cwd(), file)}`);
    }
  } finally {
    if (globalThis.__editorialDatabaseConnectionInitialized) {
      const { closeDatabaseConnection } = await import('@/db');

      await closeDatabaseConnection();
    }
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    outputDirectory: './migration/post-migration-author-dedupe',
    finalReview: false,
    dryRun: false,
    preflight: false,
    apply: false,
    resume: false,
    batchSize: 5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--output') {
      args.outputDirectory = readArgValue(argv, index, '--output');
      index += 1;
      continue;
    }

    if (arg === '--final-review') {
      args.finalReview = true;
      continue;
    }

    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (arg === '--preflight') {
      args.preflight = true;
      continue;
    }

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--resume') {
      args.resume = true;
      continue;
    }

    if (arg === '--confirm') {
      args.confirm = readArgValue(argv, index, '--confirm');
      index += 1;
      continue;
    }

    if (arg === '--batch-size') {
      args.batchSize = readPositiveInteger(
        readArgValue(argv, index, '--batch-size'),
        '--batch-size',
      );
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function readArgValue(args: string[], index: number, name: string) {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}.`);
  }

  return value;
}

function printHelp() {
  console.log(`Usage:
  npm run migration:author-dedupe
  npm run migration:author-dedupe -- --final-review
  npm run migration:author-dedupe -- --dry-run
  npm run migration:author-dedupe -- --preflight
  npm run migration:author-dedupe -- --apply --confirm AUTHOR_DEDUPE --batch-size 5
  npm run migration:author-dedupe -- --apply --confirm AUTHOR_DEDUPE --resume --batch-size 5
  npm run migration:author-dedupe -- --output ./migration/post-migration-author-dedupe`);
}

function readPositiveInteger(value: string, name: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown author dedupe audit error.';
  console.error(`Author dedupe audit failed: ${message}`);
  process.exitCode = 1;
});
