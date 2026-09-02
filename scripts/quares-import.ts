import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseQuaresWorkbook } from '@/features/quares-import/excel-parser';
import {
  loadQuaresManualMappings,
  validateQuaresManualMappings,
} from '@/features/quares-import/manual-mappings';
import { matchQuaresRows } from '@/features/quares-import/matcher';
import { buildQuaresImportPlan, type QuaresImportPlan } from '@/features/quares-import/planner';
import { normalizeBookTitle } from '@/features/quares-import/title-normalizer';
import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';

interface CliOptions {
  file: string;
  apply: boolean;
  confirm: string | null;
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);

  let file = 'data/imports/libros_quares.xlsx';

  let apply = false;
  let confirm: string | null = null;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--file') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('--file requires a path.');
      }

      file = value;
      index += 1;
      continue;
    }

    if (argument === '--apply') {
      apply = true;
      continue;
    }

    if (argument === '--dry-run') {
      apply = false;
      continue;
    }

    if (argument === '--confirm') {
      const value = args[index + 1];

      if (!value) {
        throw new Error('--confirm requires a value.');
      }

      confirm = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (apply && confirm !== 'QUARES_IMPORT') {
    throw new Error('Apply requires --confirm QUARES_IMPORT.');
  }

  return {
    file,
    apply,
    confirm,
  };
}

async function main() {
  const options = parseOptions();

  loadPilotCliEnv(process.cwd());

  try {
    const [bookRepository, salesRepository, quaresImportService] = await Promise.all([
      import('@/repositories/books/book.repository'),
      import('@/repositories/sales/sales.repository'),
      import('@/services/sales/quares-import.service'),
    ]);

    const workbookPath = path.resolve(process.cwd(), options.file);

    const mappingsPath = path.resolve(
      process.cwd(),
      'data/import-decisions/quares-book-mappings.json',
    );

    const source = await parseQuaresWorkbook(workbookPath);

    if (source.issues.length > 0) {
      throw new Error(`Source contains ${source.issues.length} validation issue(s).`);
    }

    const [books, quaresChannel] = await Promise.all([
      bookRepository.findAll('all'),
      salesRepository.findChannelBySlug('quares'),
    ]);

    if (!quaresChannel) {
      throw new Error('Quares channel not found.');
    }

    const [existingProducts, markets] = await Promise.all([
      salesRepository.findProductsByChannelId(quaresChannel.id),
      salesRepository.findMarketsByChannelId(quaresChannel.id),
    ]);

    const bookCandidates = books.map((book) => ({
      id: book.id,
      title: book.title,
      normalizedTitle: normalizeBookTitle(book.title),
      slug: book.slug,
      isArchived: book.isArchived,
      authors: book.authors.map((author) => author.name),
    }));

    const manualConfiguration = await loadQuaresManualMappings(mappingsPath);

    const validatedMappings = validateQuaresManualMappings({
      configuration: manualConfiguration,
      sourceRows: source.rows,
      books: bookCandidates,
    });

    if (validatedMappings.issues.length > 0) {
      for (const issue of validatedMappings.issues) {
        console.error(`mapping issue: ${issue.externalProductId}: ${issue.reason}`);
      }

      throw new Error('Manual mapping validation failed.');
    }

    const existingIdentities = existingProducts.flatMap((product) => {
      const externalProductId = product.externalProductId?.trim();

      if (!externalProductId) {
        return [];
      }

      return [
        {
          bookId: product.bookId,
          externalProductId,
        },
      ];
    });

    const matching = matchQuaresRows({
      sourceRows: source.rows,
      books: bookCandidates,
      existingQuaresProducts: existingIdentities,
      manualMappings: validatedMappings.mappings,
      skippedExternalProductIds: validatedMappings.skippedExternalProductIds,
    });

    const availabilityEntries = await Promise.all(
      existingProducts.map(async (product) => {
        const availability = await salesRepository.findAvailabilityByProductId(product.id);

        return [product.id, availability.map((item) => item.salesChannelMarketId)] as const;
      }),
    );

    const availabilityByProductId = new Map(availabilityEntries);

    const plan = buildQuaresImportPlan({
      matchedRows: matching.rows,
      existingProducts: existingProducts.map((product) => ({
        id: product.id,
        bookId: product.bookId,
        externalProductId: product.externalProductId,
        status: product.status,
        isActive: product.isActive,
      })),
      availabilityByProductId,
      markets: markets.map((market) => ({
        id: market.id,
        countryCode: market.countryCode,
        isActive: market.isActive,
      })),
    });

    printPlan(plan);

    const sourceBuffer = await readFile(workbookPath);

    const sourceSha256 = createHash('sha256').update(sourceBuffer).digest('hex');

    const reportDirectory = path.resolve(process.cwd(), 'data/import-reports/quares');

    await mkdir(reportDirectory, {
      recursive: true,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const reportPath = path.join(reportDirectory, `quares-import-${timestamp}.json`);

    const report = {
      generatedAt: new Date().toISOString(),
      mode: options.apply ? 'apply' : 'dry-run',
      source: {
        file: options.file,
        sha256: sourceSha256,
        totalRows: source.totalSourceRows,
      },
      matching: matching.summary,
      plan: plan.summary,
      rows: plan.rows,
    };

    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

    console.log('');
    console.log(`Report: ${reportPath}`);

    if (!options.apply) {
      console.log('');
      console.log('DRY-RUN ONLY — no database writes performed.');
      return;
    }

    if (plan.summary.conflicts > 0 || plan.summary.invalid > 0) {
      throw new Error('Apply blocked because CONFLICT or INVALID rows exist.');
    }

    const readyRows = plan.rows.filter(
      (row) => row.operation === 'READY_CREATE' || row.operation === 'READY_UPDATE',
    );

    const applied = await quaresImportService.applyQuaresImport(
      readyRows.map((row) => {
        if (!row.bookId) {
          throw new Error(`Missing book ID for source row ${row.sourceRow}.`);
        }

        return {
          bookId: row.bookId,
          salesChannelId: quaresChannel.id,
          externalProductId: row.externalProductId,
          marketIds: row.desiredMarketIds,
        };
      }),
    );

    console.log('');
    console.log(`APPLY COMPLETE — ${applied} Quares product(s) synchronized.`);

    console.log('');
    console.log('Run the same command again in dry-run mode to verify idempotence.');
  } finally {
    await cleanupPilotRuntime();
  }
}

function printPlan(plan: QuaresImportPlan): void {
  console.log('');
  console.log('============================================================');
  console.log('QUARES IMPORT PLAN');
  console.log('============================================================');

  console.log('');
  console.log(`Source rows: ${plan.summary.sourceRows}`);
  console.log(`READY_CREATE: ${plan.summary.readyCreate}`);
  console.log(`READY_UPDATE: ${plan.summary.readyUpdate}`);
  console.log(`UNCHANGED: ${plan.summary.unchanged}`);
  console.log(`SKIPPED: ${plan.summary.skipped}`);
  console.log(`AMBIGUOUS: ${plan.summary.ambiguous}`);
  console.log(`NOT_FOUND: ${plan.summary.notFound}`);
  console.log(`CONFLICT: ${plan.summary.conflicts}`);
  console.log(`INVALID: ${plan.summary.invalid}`);

  const unresolved = plan.rows.filter(
    (row) =>
      row.operation === 'NOT_FOUND' || row.operation === 'AMBIGUOUS' || row.operation === 'SKIPPED',
  );

  if (unresolved.length > 0) {
    console.log('');
    console.log('LEFT FOR MANUAL REVIEW');

    for (const row of unresolved) {
      console.log(
        `- ${row.operation} row=${row.sourceRow} quares=${row.externalProductId} title="${row.sourceTitle}"`,
      );
    }
  }

  const conflicts = plan.rows.filter(
    (row) => row.operation === 'CONFLICT' || row.operation === 'INVALID',
  );

  if (conflicts.length > 0) {
    console.log('');
    console.log('BLOCKING ISSUES');

    for (const row of conflicts) {
      console.log(
        `- ${row.operation} row=${row.sourceRow} quares=${row.externalProductId} book="${row.bookTitle ?? ''}" reason="${row.reason}"`,
      );
    }
  }

  const existing67778 = plan.rows.find((row) => row.externalProductId === '67778');

  if (existing67778) {
    console.log('');
    console.log('REGRESSION CHECK — 67778');
    console.log(`Cuando el río suena: ${existing67778.operation}`);

    if (existing67778.operation === 'READY_CREATE') {
      throw new Error('Regression failure: existing Quares 67778 must not be READY_CREATE.');
    }
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Quares import failed.');

  console.error(error);
  process.exitCode = 1;
});
