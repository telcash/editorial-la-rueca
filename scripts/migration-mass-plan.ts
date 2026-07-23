import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { readPilotAuditData } from '@/features/migration/wordpress-pilot/audit-data';
import { planMassMigration } from '@/features/migration/wordpress-mass/planner';
import { writeMassPlanOutputs } from '@/features/migration/wordpress-mass/output';

interface CliOptions {
  auditDirectory: string;
  outputDirectory: string;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const auditDirectory = path.resolve(process.cwd(), options.auditDirectory);
  const outputDirectory = path.resolve(process.cwd(), options.outputDirectory);
  const data = await readPilotAuditData(auditDirectory, './migration/pilot/decisions.json');
  const bookCoverBestMatches = JSON.parse(
    await readFile(path.join(auditDirectory, 'book-cover-best-match.json'), 'utf8'),
  ) as Parameters<typeof planMassMigration>[0]['bookCoverBestMatches'];
  const plan = planMassMigration({
    data,
    bookCoverBestMatches,
  });
  const files = await writeMassPlanOutputs(plan, outputDirectory);

  console.log('WordPress mass migration plan completed.');
  console.log(`Audit: ${path.relative(process.cwd(), auditDirectory)}`);
  console.log(`Output: ${path.relative(process.cwd(), outputDirectory)}`);
  console.log(`Authors candidates: ${plan.summary.authors.totalCandidates}`);
  console.log(`Authors READY: ${plan.summary.authors.ready}`);
  console.log(`Books candidates: ${plan.summary.books.totalCandidates}`);
  console.log(`Books READY: ${plan.summary.books.ready}`);
  console.log(
    `Relations auto/manual/blocked: ${plan.summary.relations.auto}/${plan.summary.relations.manual}/${plan.summary.relations.blocked}`,
  );
  console.log(`High-confidence covers: ${plan.summary.books.highConfidenceCover}`);
  console.log(`Blockers: ${plan.summary.blockers}`);
  console.log('Generated files:');

  for (const file of files) {
    console.log(`- ${path.relative(process.cwd(), file)}`);
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    auditDirectory: './migration/audit',
    outputDirectory: './migration/mass',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--audit') {
      options.auditDirectory = readArgValue(argv, index, '--audit');
      index += 1;
      continue;
    }

    if (arg === '--output') {
      options.outputDirectory = readArgValue(argv, index, '--output');
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
  npm run migration:mass-plan -- --audit ./migration/audit [--output ./migration/mass]`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown mass migration planning error.';
  console.error(`Mass migration planning failed: ${message}`);
  process.exitCode = 1;
});
