import path from 'node:path';

import {
  readMassResolutionInput,
  resolveMassBlockers,
  writeMassResolutionOutputs,
} from '@/features/migration/wordpress-mass/resolution';

interface CliOptions {
  massDirectory: string;
  auditDirectory: string;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const massDirectory = path.resolve(process.cwd(), options.massDirectory);
  const auditDirectory = path.resolve(process.cwd(), options.auditDirectory);
  const input = await readMassResolutionInput(massDirectory, auditDirectory);
  const result = resolveMassBlockers(input);
  const files = await writeMassResolutionOutputs(result, massDirectory);

  console.log('WordPress mass blocker resolution completed.');
  console.log(`Mass: ${path.relative(process.cwd(), massDirectory)}`);
  console.log(`Audit: ${path.relative(process.cwd(), auditDirectory)}`);
  console.log(`Duplicate groups: ${result.authorDuplicateReview.summary.duplicateGroups}`);
  console.log(`Affected author records: ${result.authorDuplicateReview.summary.affectedRecords}`);
  console.log(
    `Author proposals high/likely/keep/manual: ${result.authorDuplicateReview.summary.mergeHighConfidence}/${result.authorDuplicateReview.summary.likelyMergeManualConfirmation}/${result.authorDuplicateReview.summary.keepSeparate}/${result.authorDuplicateReview.summary.manualReview}`,
  );
  console.log(
    `Relations ready after high-confidence proposals: ${result.relationResolution.afterHighConfidence.ready}`,
  );
  console.log(
    `Relations still blocked after high-confidence proposals: ${result.relationResolution.afterHighConfidence.stillBlocked}`,
  );
  console.log(`book:r status: ${result.bookR.status}`);
  console.log(`Post-merge slug conflicts: ${result.postMergeSlugConflicts.length}`);
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
  npm run migration:mass-resolve -- --mass ./migration/mass --audit ./migration/audit`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown mass blocker resolution error.';
  console.error(`Mass blocker resolution failed: ${message}`);
  process.exitCode = 1;
});
