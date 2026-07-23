import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { auditWordPressExport } from '../src/features/migration/wordpress-audit/audit';
import { writeAuditOutput } from '../src/features/migration/wordpress-audit/output';

interface CliOptions {
  input: string;
  output: string;
  force: boolean;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.input);
  const outputDirectory = path.resolve(process.cwd(), options.output);
  const sourceStats = await stat(inputPath);
  const xml = await readFile(inputPath, 'utf8');
  const result = auditWordPressExport(xml, options.input, sourceStats.size);
  const generatedFiles = await writeAuditOutput(result, {
    outputDirectory,
    force: options.force,
  });

  console.log('WordPress migration audit completed.');
  console.log(`Input: ${options.input}`);
  console.log(`Output: ${path.relative(process.cwd(), outputDirectory)}`);
  console.log(`Post types: ${Object.keys(result.report.countsByPostType).length}`);
  console.log(`Author CPT records: ${result.report.totalAutoresCpt}`);
  console.log(`Book CPT records: ${result.report.totalLibrosCpt}`);
  console.log(`Unique legacy book candidates: ${result.report.statistics.uniqueBookCandidates}`);
  console.log(`Issues: ${result.issues.length}`);
  console.log('Generated files:');

  for (const file of generatedFiles) {
    console.log(`- ${path.relative(process.cwd(), file)}`);
  }
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    input: '',
    output: './migration/audit',
    force: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--input') {
      options.input = readArgValue(args, index, '--input');
      index += 1;
      continue;
    }

    if (arg === '--output') {
      options.output = readArgValue(args, index, '--output');
      index += 1;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.input) {
    printHelp();
    throw new Error('Missing required --input <path> argument.');
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
  npm run migration:audit -- --input <path> [--output ./migration/audit] [--force]

Examples:
  npm run migration:audit -- --input ./migration/editoriallarueca.WordPress.2026-07-15.xml
  npm run migration:audit -- --input ./migration/editoriallarueca.WordPress.2026-07-15.xml --output ./migration/audit --force`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration audit error.';
  console.error(`Migration audit failed: ${message}`);
  process.exit(1);
});
