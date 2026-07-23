import path from 'node:path';

import { readPilotAuditData } from '@/features/migration/wordpress-pilot/audit-data';
import {
  analyzeBookCoverCandidates,
  getPilotBookCoverMatches,
} from '@/features/migration/wordpress-audit/book-cover-analysis';
import { writeBookCoverAnalysisOutputs } from '@/features/migration/wordpress-audit/book-cover-output';

interface CliOptions {
  auditDirectory: string;
  pilotDirectory: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    auditDirectory: './migration/audit',
    pilotDirectory: './migration/pilot',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--audit') {
      options.auditDirectory = readArgValue(argv, index, '--audit');
      index += 1;
      continue;
    }

    if (arg === '--pilot') {
      options.pilotDirectory = readArgValue(argv, index, '--pilot');
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

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const auditDirectory = path.resolve(process.cwd(), options.auditDirectory);
  const pilotDirectory = path.resolve(process.cwd(), options.pilotDirectory);
  const data = await readPilotAuditData(auditDirectory);
  const analysis = analyzeBookCoverCandidates(data);
  const outputs = await writeBookCoverAnalysisOutputs({
    analysis,
    auditDirectory,
    pilotDirectory,
  });
  const pilotMatches = getPilotBookCoverMatches(analysis);

  console.log('Book cover audit completed.');
  console.log(`Books analyzed: ${analysis.statistics.totalBooks}`);
  console.log(`High confidence: ${analysis.statistics.highConfidence}`);
  console.log(`Medium confidence: ${analysis.statistics.mediumConfidence}`);
  console.log(`Low confidence: ${analysis.statistics.lowConfidence}`);
  console.log(`Without candidate: ${analysis.statistics.withoutCandidate}`);
  console.log('Pilot books:');

  for (const match of pilotMatches) {
    const candidates = [match.bestCandidate, ...match.alternatives].filter(Boolean);
    console.log(`- ${match.bookTitle}: ${candidates.length} candidates`);
  }

  console.log('Generated files:');
  console.log(`- ${path.relative(process.cwd(), outputs.candidatesPath)}`);
  console.log(`- ${path.relative(process.cwd(), outputs.bestMatchPath)}`);
  console.log(`- ${path.relative(process.cwd(), outputs.reviewHtmlPath)}`);
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
  npm run migration:book-cover-audit -- [--audit ./migration/audit] [--pilot ./migration/pilot]`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown book cover audit error.';
  console.error(`Book cover audit failed: ${message}`);
  process.exitCode = 1;
});
