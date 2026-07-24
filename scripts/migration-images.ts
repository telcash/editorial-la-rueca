import path from 'node:path';

import { loadEnvConfig } from '@next/env';

interface CliArgs {
  analyze: boolean;
  dryRun: boolean;
  preflight: boolean;
  apply: boolean;
  diagnoseBookCovers: boolean;
  adjudicateBookCovers: boolean;
  editorialReview: boolean;
  resume: boolean;
  confirm?: string;
  batchSize: number;
  massDirectory: string;
  auditDirectory: string;
  input?: string;
}

async function main() {
  loadEnvConfig(process.cwd());
  try {
    const args = parseArgs(process.argv.slice(2));
    const { runImageRecovery } =
      await import('@/features/migration/wordpress-image-recovery/runner');
    const result = await runImageRecovery(args);

    if (result.mode === 'diagnose-book-covers') {
      console.log('WordPress book cover diagnosis completed.');
      console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
      console.log(`Books analyzed: ${result.diagnosis.statistics.totalBooksAnalyzed}`);
      console.log(`Without any image: ${result.diagnosis.statistics.withoutAnyImage}`);
      console.log(`Only author photo: ${result.diagnosis.statistics.onlyAuthorPhoto}`);
      console.log(`Strong candidates: ${result.diagnosis.statistics.hasStrongCandidate}`);
      console.log(`Multiple candidates: ${result.diagnosis.statistics.hasMultipleCandidates}`);
      console.log(`HTML images: ${result.diagnosis.statistics.hasHtmlImages}`);
      console.log('Top opportunities:');

      for (const opportunity of result.diagnosis.statistics.topOpportunities) {
        console.log(`- ${opportunity.rule}: ${opportunity.recoverableCovers}`);
      }

      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      return;
    }

    if (result.mode === 'adjudicate-book-covers') {
      console.log('WordPress book cover adjudication completed.');
      console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
      console.log(`Books adjudicated: ${result.adjudication.statistics.totalBooksAdjudicated}`);
      console.log(`safe_book_cover: ${result.adjudication.statistics.safeBookCover}`);
      console.log(`ambiguous: ${result.adjudication.statistics.ambiguous}`);
      console.log(`no_safe_candidate: ${result.adjudication.statistics.noSafeCandidate}`);
      console.log(
        `Rejected by author photo conflict: ${result.adjudication.statistics.rejectedByAuthorPhotoConflict}`,
      );
      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      return;
    }

    if (result.mode === 'editorial-review') {
      console.log('WordPress image recovery editorial review completed.');
      console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
      console.log(`Total: ${result.review.statistics.total}`);
      console.log(`Approved: ${result.review.statistics.approved}`);
      console.log(`Manual: ${result.review.statistics.manual}`);
      console.log(`Rejected: ${result.review.statistics.rejected}`);
      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      return;
    }

    if (
      result.mode === 'image-recovery-dry-run' ||
      result.mode === 'image-recovery-preflight' ||
      result.mode === 'image-recovery-apply'
    ) {
      console.log('WordPress image recovery Stage 4 completed.');
      console.log(`Mode: ${result.plan.mode}`);
      console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
      console.log('BOOK COVERS');
      console.log(`- approved total: ${result.plan.result.bookCovers.approvedTotal}`);
      console.log(`- algorithm selections: ${result.plan.result.bookCovers.algorithmSelections}`);
      console.log(
        `- editorial-manual selections: ${result.plan.result.bookCovers.editorialManualSelections}`,
      );
      console.log(`- rejected: ${result.plan.result.bookCovers.rejected}`);
      console.log(`- manual review: ${result.plan.result.bookCovers.manualReview}`);
      console.log(`- ready to apply: ${result.plan.result.bookCovers.readyToApply}`);
      console.log(`- blocked/errors: ${result.plan.result.bookCovers.blocked}`);
      console.log('AUTHOR PHOTOS');
      console.log(`- safe ready: ${result.plan.result.authorPhotos.safeReady}`);
      console.log(`- technical retries: ${result.plan.result.authorPhotos.technicalRetries}`);
      console.log(`- already migrated: ${result.plan.result.authorPhotos.alreadyMigrated}`);
      console.log(`- manual/ambiguous: ${result.plan.result.authorPhotos.manualOrAmbiguous}`);
      console.log(`- blocked/errors: ${result.plan.result.authorPhotos.blocked}`);
      console.log(`TOTAL OPERATIONS TO APPLY: ${result.plan.result.totalOperationsToApply}`);
      console.log(`Blockers: ${result.plan.result.blockers}`);
      console.log('Generated files:');

      for (const file of result.files) {
        console.log(`- ${path.relative(process.cwd(), file)}`);
      }

      return;
    }

    if (result.mode !== 'recovery') {
      return;
    }

    console.log('WordPress image recovery completed.');
    console.log(`Mode: ${result.plan.mode}`);
    console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
    console.log(`Technical retries: ${result.plan.result.technicalRetry}`);
    console.log(`Safe author photos: ${result.plan.result.safeAuthorPhoto}`);
    console.log(`Safe book covers: ${result.plan.result.safeBookCover}`);
    console.log(`Ambiguous: ${result.plan.result.ambiguous}`);
    console.log(`No candidate: ${result.plan.result.noCandidate}`);
    console.log(`Automatically recoverable: ${result.plan.result.automaticallyRecoverable}`);
    console.log('Generated files:');

    for (const file of result.files) {
      console.log(`- ${path.relative(process.cwd(), file)}`);
    }
  } finally {
    const { cleanupImageRecoveryRuntime } =
      await import('@/features/migration/wordpress-image-recovery/runtime-cleanup');

    await cleanupImageRecoveryRuntime();
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    analyze: false,
    dryRun: false,
    preflight: false,
    apply: false,
    diagnoseBookCovers: false,
    adjudicateBookCovers: false,
    editorialReview: false,
    resume: false,
    batchSize: 20,
    massDirectory: './migration/mass',
    auditDirectory: './migration/audit',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--analyze') {
      args.analyze = true;
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

    if (arg === '--diagnose-book-covers') {
      args.diagnoseBookCovers = true;
      continue;
    }

    if (arg === '--adjudicate-book-covers') {
      args.adjudicateBookCovers = true;
      continue;
    }

    if (arg === '--editorial-review') {
      args.editorialReview = true;
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
      args.batchSize = Number(readArgValue(argv, index, '--batch-size'));
      index += 1;
      continue;
    }

    if (arg === '--mass') {
      args.massDirectory = readArgValue(argv, index, '--mass');
      index += 1;
      continue;
    }

    if (arg === '--audit') {
      args.auditDirectory = readArgValue(argv, index, '--audit');
      index += 1;
      continue;
    }

    if (arg === '--input') {
      args.input = readArgValue(argv, index, '--input');
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const selectedModes = [
    args.analyze,
    args.dryRun,
    args.preflight,
    args.apply,
    args.diagnoseBookCovers,
    args.adjudicateBookCovers,
    args.editorialReview,
  ].filter(Boolean).length;

  if (selectedModes !== 1) {
    throw new Error(
      'Usa exactamente uno de: --analyze, --dry-run, --apply, --diagnose-book-covers, --adjudicate-book-covers o --editorial-review.',
    );
  }

  if (!Number.isFinite(args.batchSize) || args.batchSize < 1) {
    throw new Error('--batch-size debe ser un numero mayor que cero.');
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
  npm run migration:images -- --analyze [--mass ./migration/mass] [--audit ./migration/audit] [--input ./export.xml]
  npm run migration:images -- --dry-run [--batch-size 20]
  npm run migration:images -- --preflight [--batch-size 20]
  npm run migration:images -- --diagnose-book-covers [--input ./export.xml]
  npm run migration:images -- --adjudicate-book-covers
  npm run migration:images -- --editorial-review
  npm run migration:images -- --apply --confirm IMAGE_RECOVERY --resume`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown image recovery error.';
  console.error(`Image recovery failed: ${message}`);
  process.exitCode = 1;
});
