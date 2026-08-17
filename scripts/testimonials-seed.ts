import path from 'node:path';

import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';

interface CliArgs {
  outputDirectory: string;
  dryRun: boolean;
  preflight: boolean;
  apply: boolean;
  confirm?: string;
}

async function main() {
  loadPilotCliEnv(process.cwd());

  try {
    const args = parseArgs(process.argv.slice(2));
    const { runAuthorTestimonialsSeed } =
      await import('@/features/migration/author-testimonials-seed/runner');
    const mode = args.apply ? 'apply' : args.preflight ? 'preflight' : 'dry-run';
    const result = await runAuthorTestimonialsSeed({
      outputDirectory: args.outputDirectory,
      mode,
      confirm: args.confirm,
    });

    console.log('Author testimonials seed completed.');
    console.log(`Mode: ${mode}`);
    console.log(`Output: ${path.relative(process.cwd(), path.resolve(result.outputDirectory))}`);
    console.log(`Testimonios: ${result.plan.summary.total}`);
    console.log(`Exact author matches: ${result.plan.summary.exactAuthorMatches}`);
    console.log(`Likely author matches: ${result.plan.summary.likelyAuthorMatches}`);
    console.log(`Ambiguous author matches: ${result.plan.summary.ambiguousAuthorMatches}`);
    console.log(`Authors not found: ${result.plan.summary.authorsNotFound}`);
    console.log(`Books exact: ${result.plan.summary.exactBookMatches}`);
    console.log(`Books likely: ${result.plan.summary.likelyBookMatches}`);
    console.log(`Books ambiguous: ${result.plan.summary.ambiguousBookMatches}`);
    console.log(`Books not found: ${result.plan.summary.booksNotFound}`);
    console.log(`Ready to insert: ${result.plan.summary.readyToInsert}`);
    console.log(`Manual review: ${result.plan.summary.manualReview}`);
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
    outputDirectory: './migration/author-testimonials-seed',
    dryRun: false,
    preflight: false,
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--output') {
      args.outputDirectory = readArgValue(argv, index, '--output');
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

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const selectedModes = [args.dryRun, args.preflight, args.apply].filter(Boolean).length;

  if (selectedModes === 0) {
    args.dryRun = true;
  } else if (selectedModes !== 1) {
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
  npm run testimonials:seed -- --dry-run
  npm run testimonials:seed -- --preflight
  npm run testimonials:seed -- --apply --confirm TESTIMONIAL_SEED
  npm run testimonials:seed -- --output ./migration/author-testimonials-seed`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown testimonials seed error.';
  console.error(`Author testimonials seed failed: ${message}`);
  process.exitCode = 1;
});
