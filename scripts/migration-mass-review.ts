import path from 'node:path';

import {
  createFinalReview,
  ensureNoFinalMassDecisions,
  readFinalReviewInput,
  writeFinalReviewOutputs,
} from '@/features/migration/wordpress-mass/final-review';

interface CliOptions {
  massDirectory: string;
  auditDirectory: string;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const massDirectory = path.resolve(process.cwd(), options.massDirectory);
  const auditDirectory = path.resolve(process.cwd(), options.auditDirectory);

  await ensureNoFinalMassDecisions(massDirectory);

  const input = await readFinalReviewInput(massDirectory);
  const result = createFinalReview(input);
  const files = await writeFinalReviewOutputs(result, massDirectory);

  console.log('WordPress mass duplicate final review completed.');
  console.log(`Mass: ${path.relative(process.cwd(), massDirectory)}`);
  console.log(`Audit: ${path.relative(process.cwd(), auditDirectory)}`);
  console.log(`Duplicate groups included: ${result.orderedGroups.length}`);
  console.log(
    `High-confidence: ${result.orderedGroups.filter((group) => group.proposal === 'MERGE_HIGH_CONFIDENCE').length}`,
  );
  console.log(
    `Likely merge: ${result.orderedGroups.filter((group) => group.proposal === 'LIKELY_MERGE_MANUAL_CONFIRMATION').length}`,
  );
  console.log(`SAFE_TO_APPROVE_MERGE: ${result.decisionSummary.counts.safeToApproveMerge}`);
  console.log(
    `Needs field decisions: ${result.decisionSummary.counts.needsMultipleFieldDecisions}`,
  );
  console.log('Generated files:');

  for (const filePath of Object.values(files)) {
    console.log(`- ${path.relative(process.cwd(), filePath)}`);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    massDirectory: './migration/mass',
    auditDirectory: './migration/audit',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--mass') {
      options.massDirectory = readArgValue(argv, index, '--mass');
      index += 1;
      continue;
    }

    if (arg === '--audit') {
      options.auditDirectory = readArgValue(argv, index, '--audit');
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
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
  npm run migration:mass-review -- --mass ./migration/mass --audit ./migration/audit`);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown mass duplicate final review error.';
  console.error(`Mass duplicate final review failed: ${message}`);
  process.exitCode = 1;
});
