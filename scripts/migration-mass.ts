import path from 'node:path';

import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';
import { runMassMigration } from '@/features/migration/wordpress-mass-apply/runner';

interface CliArgs {
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

async function main() {
  loadPilotCliEnv(process.cwd());

  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await runMassMigration(args);

    console.log('WordPress mass migration engine completed.');
    console.log(`Mode: ${result.plan.mode}`);
    console.log(`Mass: ${path.relative(process.cwd(), path.resolve(args.massDirectory))}`);
    console.log(`Output: ${path.relative(process.cwd(), result.outputDirectory)}`);
    console.log(
      `Authors create/reuse: ${result.plan.summary.authorsToCreate}/${result.plan.summary.authorsReusedFromPilot}`,
    );
    console.log(
      `Books create/reuse/skipped: ${result.plan.summary.booksToCreate}/${result.plan.summary.booksReusedFromPilot}/${result.plan.summary.booksSkipped}`,
    );
    console.log(
      `Relations ready/skipped: ${result.plan.summary.relationsReady}/${result.plan.summary.relationsSkipped}`,
    );
    console.log(
      `Author images ready/manual: ${result.plan.summary.authorImagesReady}/${result.plan.summary.authorImagesManualOrNoImage}`,
    );
    console.log(
      `Book covers ready/manual: ${result.plan.summary.bookCoversReady}/${result.plan.summary.bookCoversManualLowNoCover}`,
    );
    console.log(`Batches: ${result.plan.summary.batches}`);
    console.log(`Blockers: ${result.plan.summary.blockers}`);
    console.log('Generated files:');

    for (const file of result.files) {
      console.log(`- ${path.relative(process.cwd(), file)}`);
    }
  } finally {
    await cleanupPilotRuntime();
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    massDirectory: './migration/mass',
    dryRun: false,
    preflight: false,
    apply: false,
    confirmBackup: false,
    resume: false,
    batchSize: 20,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mass') {
      args.massDirectory = readArgValue(argv, index, '--mass');
      index += 1;
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

    if (arg === '--confirm') {
      args.confirm = readArgValue(argv, index, '--confirm');
      index += 1;
      continue;
    }

    if (arg === '--confirm-backup') {
      args.confirmBackup = true;
      continue;
    }

    if (arg === '--resume') {
      args.resume = true;
      continue;
    }

    if (arg === '--batch-size') {
      args.batchSize = Number(readArgValue(argv, index, '--batch-size'));
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      args.limit = Number(readArgValue(argv, index, '--limit'));
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const selectedModes = [args.dryRun, args.preflight, args.apply].filter(Boolean).length;

  if (selectedModes !== 1) {
    throw new Error('Usa exactamente uno de: --dry-run, --preflight o --apply.');
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
  npm run migration:mass -- --mass ./migration/mass --dry-run [--batch-size 20] [--limit 20]
  npm run migration:mass -- --mass ./migration/mass --preflight
  npm run migration:mass -- --mass ./migration/mass --apply --confirm MASS_MIGRATION --confirm-backup`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown mass migration error.';
  console.error(`Mass migration failed: ${message}`);
  process.exitCode = 1;
});
