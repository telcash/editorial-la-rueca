import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { auditAmazonDocx } from '@/features/amazon-import/docx-parser';
import {
  matchAmazonSource,
  type AmazonBookCandidate,
  type AmazonManualMapping,
} from '@/features/amazon-import/matcher';
import { buildAmazonImportPlan, type AmazonImportPlan } from '@/features/amazon-import/planner';
import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';
import { normalizeBookTitle } from '@/features/quares-import/title-normalizer';

const AMAZON_IMPORT_CONFIRMATION = 'AMAZON_IMPORT';

interface AmazonManualMappingFile {
  version: number;
  mappings: AmazonManualMapping[];
}

interface CliOptions {
  mode: 'dry-run' | 'apply';
  confirm?: string;
}

interface AmazonImportReportRow {
  sourceIndex: number;
  title: string;
  author: string | null;
  asin: string | null;
  purchaseUrl: string | null;
  sourceStatus: string;
  operation: string;
  reason: string;
  matchedBookId: string | null;
  matchedBookTitle: string | null;
  existingProductId: string | null;
}

interface AmazonImportReport {
  generatedAt: string;
  mode: 'dry-run' | 'apply';
  source: {
    filePath: string;
    sha256: string;
  };
  amazonChannelId: string;
  existingAmazonProducts: number;
  manualMappings: number;
  matchingSummary: {
    sourceRecords: number;
    matched: number;
    matchedByExactTitle: number;
    matchedByManual: number;
    skipped: number;
    ambiguous: number;
    notFound: number;
    conflicts: number;
  };
  planSummary: AmazonImportPlan['summary'];
  applied: number | null;
  rows: AmazonImportReportRow[];
}

function parseCliOptions(argv: string[]): CliOptions {
  const apply = argv.includes('--apply');

  const confirmIndex = argv.indexOf('--confirm');

  const confirm = confirmIndex >= 0 ? argv[confirmIndex + 1] : undefined;

  return {
    mode: apply ? 'apply' : 'dry-run',
    confirm,
  };
}

function assertAmazonImportConfirmation(confirm: string | undefined): void {
  if (confirm !== AMAZON_IMPORT_CONFIRMATION) {
    throw new Error(`Apply protegido. Usa --apply --confirm ${AMAZON_IMPORT_CONFIRMATION}.`);
  }
}

async function loadAmazonManualMappings(filePath: string): Promise<AmazonManualMapping[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');

    const parsed = JSON.parse(raw) as AmazonManualMappingFile;

    if (parsed.version !== 1) {
      throw new Error(`Unsupported Amazon mapping file version: ${parsed.version}`);
    }

    if (!Array.isArray(parsed.mappings)) {
      throw new Error('Amazon mapping file must contain a mappings array.');
    }

    return parsed.mappings;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function calculateSha256(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);

  return createHash('sha256').update(buffer).digest('hex');
}

function validateManualMappings(
  manualMappings: AmazonManualMapping[],
  sourceAsins: Set<string>,
  bookIds: Set<string>,
): void {
  const seenMappingAsins = new Set<string>();

  for (const mapping of manualMappings) {
    const normalizedAsin = mapping.asin.trim().toUpperCase();

    if (!normalizedAsin) {
      throw new Error('Amazon manual mapping contains an empty ASIN.');
    }

    if (seenMappingAsins.has(normalizedAsin)) {
      throw new Error(`Amazon manual mapping contains duplicate ASIN ${normalizedAsin}.`);
    }

    seenMappingAsins.add(normalizedAsin);

    if (!sourceAsins.has(normalizedAsin)) {
      throw new Error(`Amazon manual mapping references unknown ASIN ${mapping.asin}.`);
    }

    if (mapping.action === 'MAP' && (!mapping.bookId || !bookIds.has(mapping.bookId))) {
      throw new Error(
        `Amazon manual mapping ASIN=${mapping.asin} references an unknown or missing bookId.`,
      );
    }
  }
}

function printPlanSummary(plan: AmazonImportPlan, existingAmazonProducts: number): void {
  console.log('');
  console.log('============================================================');
  console.log('AMAZON IMPORT PLAN');
  console.log('============================================================');

  console.log('');
  console.log('DATABASE');
  console.log(`Existing Amazon products: ${existingAmazonProducts}`);

  console.log('');
  console.log('PLAN SUMMARY');
  console.log(`Source records: ${plan.summary.sourceRecords}`);
  console.log(`READY_CREATE: ${plan.summary.readyCreate}`);
  console.log(`READY_UPDATE: ${plan.summary.readyUpdate}`);
  console.log(`UNCHANGED: ${plan.summary.unchanged}`);
  console.log(`SKIPPED: ${plan.summary.skipped}`);
  console.log(`AMBIGUOUS: ${plan.summary.ambiguous}`);
  console.log(`NOT_FOUND: ${plan.summary.notFound}`);
  console.log(`CONFLICT: ${plan.summary.conflicts}`);

  const unresolved = plan.rows.filter(
    (row) =>
      row.operation === 'SKIPPED' ||
      row.operation === 'AMBIGUOUS' ||
      row.operation === 'NOT_FOUND' ||
      row.operation === 'CONFLICT',
  );

  if (unresolved.length > 0) {
    console.log('');
    console.log('NOT APPLIED / MANUAL REVIEW');

    for (const row of unresolved) {
      console.log(
        `- ${row.operation} source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}"`,
      );
      console.log(`    reason=${row.reason}`);
    }
  }
}

function buildReportRows(plan: AmazonImportPlan): AmazonImportReportRow[] {
  return plan.rows.map((row) => ({
    sourceIndex: row.source.sourceIndex,
    title: row.source.title,
    author: row.source.author,
    asin: row.source.asin,
    purchaseUrl: row.source.purchaseUrl,
    sourceStatus: row.source.status,
    operation: row.operation,
    reason: row.reason,
    matchedBookId: row.matchedBook?.id ?? null,
    matchedBookTitle: row.matchedBook?.title ?? null,
    existingProductId: row.existingProduct?.id ?? null,
  }));
}

async function writeReport(report: AmazonImportReport): Promise<string> {
  const reportDirectory = path.resolve(process.cwd(), 'data/import-reports/amazon');

  await fs.mkdir(reportDirectory, {
    recursive: true,
  });

  const safeTimestamp = report.generatedAt.replace(/:/g, '-').replace(/\./g, '-');

  const reportPath = path.join(reportDirectory, `amazon-import-${safeTimestamp}.json`);

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return reportPath;
}

async function main() {
  /*
   * IMPORTANT:
   *
   * Environment must be loaded BEFORE importing any module that
   * ultimately imports src/db/index.ts.
   *
   * Do not statically import repositories or the Amazon import
   * service above this point.
   */
  loadPilotCliEnv(process.cwd());

  const options = parseCliOptions(process.argv.slice(2));

  if (options.mode === 'apply') {
    assertAmazonImportConfirmation(options.confirm);
  }

  try {
    const [bookRepository, salesRepository, amazonImportService] = await Promise.all([
      import('@/repositories/books/book.repository'),
      import('@/repositories/sales/sales.repository'),
      import('@/services/sales/amazon-import.service'),
    ]);

    const sourcePath = path.resolve(process.cwd(), 'data/imports/titulos_amazon.docx');

    const mappingsPath = path.resolve(
      process.cwd(),
      'data/import-decisions/amazon-book-mappings.json',
    );

    const [source, sourceSha256] = await Promise.all([
      auditAmazonDocx(sourcePath),
      calculateSha256(sourcePath),
    ]);

    const [books, amazonChannel] = await Promise.all([
      bookRepository.findAll('all'),
      salesRepository.findChannelBySlug('amazon'),
    ]);

    if (!amazonChannel) {
      throw new Error('Amazon sales channel was not found. Run the controlled sales seed first.');
    }

    if (!amazonChannel.isActive) {
      throw new Error('Amazon sales channel is inactive. Import aborted.');
    }

    const existingAmazonProducts = await salesRepository.findProductsByChannelId(amazonChannel.id);

    const bookCandidates: AmazonBookCandidate[] = books.map((book) => ({
      id: book.id,
      title: book.title,
      normalizedTitle: normalizeBookTitle(book.title),
      slug: book.slug,
      isArchived: book.isArchived,
      authors: book.authors.map((author) => author.name),
    }));

    const manualMappings = await loadAmazonManualMappings(mappingsPath);

    const sourceAsins = new Set(
      source.records.flatMap((record) => (record.asin ? [record.asin.toUpperCase()] : [])),
    );

    const bookIds = new Set(bookCandidates.map((book) => book.id));

    validateManualMappings(manualMappings, sourceAsins, bookIds);

    const matching = matchAmazonSource({
      sourceRecords: source.records,
      books: bookCandidates,
      manualMappings,
    });

    const plan = buildAmazonImportPlan({
      matchedRows: matching.rows,
      existingAmazonProducts,
    });

    console.log('');
    console.log('============================================================');
    console.log('AMAZON IMPORT');
    console.log('============================================================');

    console.log('');
    console.log(`Mode: ${options.mode}`);
    console.log(`Source: ${sourcePath}`);
    console.log(`SHA256: ${sourceSha256}`);

    console.log('');
    console.log('MATCHING SUMMARY');
    console.log(`Source records: ${matching.summary.sourceRecords}`);
    console.log(`Matched: ${matching.summary.matched}`);
    console.log(`  by exact normalized title: ${matching.summary.matchedByExactTitle}`);
    console.log(`  by manual mapping: ${matching.summary.matchedByManual}`);
    console.log(`Skipped: ${matching.summary.skipped}`);
    console.log(`Ambiguous: ${matching.summary.ambiguous}`);
    console.log(`Not found: ${matching.summary.notFound}`);
    console.log(`Conflicts: ${matching.summary.conflicts}`);

    printPlanSummary(plan, existingAmazonProducts.length);

    let applied: number | null = null;

    if (options.mode === 'apply') {
      const result = await amazonImportService.applyAmazonImportPlan(plan, amazonChannel.id);

      applied = result.applied;

      console.log('');
      console.log('============================================================');
      console.log('APPLY COMPLETE');
      console.log('============================================================');
      console.log(`${result.applied} Amazon product(s) synchronized.`);
    } else {
      console.log('');
      console.log('No database writes performed.');
      console.log('');
      console.log('To apply this exact import run:');
      console.log(`npm run sales:import:amazon -- --apply --confirm ${AMAZON_IMPORT_CONFIRMATION}`);
    }

    const generatedAt = new Date().toISOString();

    const report: AmazonImportReport = {
      generatedAt,
      mode: options.mode,
      source: {
        filePath: sourcePath,
        sha256: sourceSha256,
      },
      amazonChannelId: amazonChannel.id,
      existingAmazonProducts: existingAmazonProducts.length,
      manualMappings: manualMappings.length,
      matchingSummary: {
        sourceRecords: matching.summary.sourceRecords,
        matched: matching.summary.matched,
        matchedByExactTitle: matching.summary.matchedByExactTitle,
        matchedByManual: matching.summary.matchedByManual,
        skipped: matching.summary.skipped,
        ambiguous: matching.summary.ambiguous,
        notFound: matching.summary.notFound,
        conflicts: matching.summary.conflicts,
      },
      planSummary: plan.summary,
      applied,
      rows: buildReportRows(plan),
    };

    const reportPath = await writeReport(report);

    console.log('');
    console.log(`Report: ${reportPath}`);
  } finally {
    await cleanupPilotRuntime();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Amazon import failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
