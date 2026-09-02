import fs from 'node:fs/promises';
import path from 'node:path';

import { auditAmazonDocx } from '@/features/amazon-import/docx-parser';
import {
  matchAmazonSource,
  type AmazonBookCandidate,
  type AmazonManualMapping,
} from '@/features/amazon-import/matcher';
import { buildAmazonImportPlan } from '@/features/amazon-import/planner';
import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';
import { findTitleSuggestions } from '@/features/quares-import/similarity';
import { normalizeBookTitle } from '@/features/quares-import/title-normalizer';

interface AmazonManualMappingFile {
  version: number;
  mappings: AmazonManualMapping[];
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

async function main() {
  loadPilotCliEnv(process.cwd());

  try {
    /*
     * Database-backed modules MUST be imported after loading
     * .env.local because src/db/index.ts reads DATABASE_URL
     * during module initialization.
     */
    const [bookRepository, salesRepository] = await Promise.all([
      import('@/repositories/books/book.repository'),
      import('@/repositories/sales/sales.repository'),
    ]);

    const sourcePath = path.resolve(process.cwd(), 'data/imports/titulos_amazon.docx');

    const mappingsPath = path.resolve(
      process.cwd(),
      'data/import-decisions/amazon-book-mappings.json',
    );

    const source = await auditAmazonDocx(sourcePath);

    const [books, amazonChannel] = await Promise.all([
      bookRepository.findAll('all'),
      salesRepository.findChannelBySlug('amazon'),
    ]);

    if (!amazonChannel) {
      throw new Error('Amazon sales channel was not found. Run the controlled sales seed first.');
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

    /*
     * Validate manual mappings before matching.
     */
    const sourceAsins = new Set(
      source.records.flatMap((record) => (record.asin ? [record.asin.toUpperCase()] : [])),
    );

    const bookIds = new Set(bookCandidates.map((book) => book.id));
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

    const result = matchAmazonSource({
      sourceRecords: source.records,
      books: bookCandidates,
      manualMappings,
    });

    const plan = buildAmazonImportPlan({
      matchedRows: result.rows,
      existingAmazonProducts,
    });

    console.log('');
    console.log('============================================================');
    console.log('AMAZON IMPORT — DATABASE MATCHING DRY-RUN');
    console.log('============================================================');

    console.log('');
    console.log('CATALOG');
    console.log(`Books loaded: ${books.length}`);
    console.log(`Validated manual mappings: ${manualMappings.length}`);

    console.log('');
    console.log('MATCHING SUMMARY');
    console.log(`Source records: ${result.summary.sourceRecords}`);
    console.log(`Matched: ${result.summary.matched}`);
    console.log(`  by exact normalized title: ${result.summary.matchedByExactTitle}`);
    console.log(`  by manual mapping: ${result.summary.matchedByManual}`);
    console.log(`Skipped: ${result.summary.skipped}`);
    console.log(`Ambiguous: ${result.summary.ambiguous}`);
    console.log(`Not found: ${result.summary.notFound}`);
    console.log(`Conflicts: ${result.summary.conflicts}`);

    const manualMatches = result.rows.filter(
      (row) => row.status === 'MATCHED' && row.matchMethod === 'MANUAL',
    );

    if (manualMatches.length > 0) {
      console.log('');
      console.log('MATCHED BY MANUAL MAPPING');

      for (const row of manualMatches) {
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} source="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
        );
        console.log(`    ${row.reason}`);
      }
    }

    const ambiguous = result.rows.filter((row) => row.status === 'AMBIGUOUS');

    if (ambiguous.length > 0) {
      console.log('');
      console.log('AMBIGUOUS');

      for (const row of ambiguous) {
        console.log('');
        console.log(
          `- source=${row.source.sourceIndex} title="${row.source.title}" author="${row.source.author ?? ''}"`,
        );
        console.log(`    url="${row.source.purchaseUrl ?? ''}"`);

        for (const candidate of row.candidates) {
          console.log(
            `    candidate=${candidate.id} title="${candidate.title}" authors="${candidate.authors.join(', ')}" slug="${candidate.slug}" archived=${candidate.isArchived}`,
          );
        }
      }
    }

    const notFound = result.rows.filter((row) => row.status === 'NOT_FOUND');

    if (notFound.length > 0) {
      console.log('');
      console.log('NOT FOUND — REVIEW SUGGESTIONS');
      console.log('Suggestions are diagnostic only. They do NOT change matching status.');

      for (const row of notFound) {
        const normalizedTitle = normalizeBookTitle(row.source.title);

        const suggestions = findTitleSuggestions(normalizedTitle, bookCandidates, 3);

        console.log('');
        console.log(
          `- source=${row.source.sourceIndex} title="${row.source.title}" author="${row.source.author ?? ''}"`,
        );
        console.log(`    url="${row.source.purchaseUrl ?? ''}"`);

        for (const suggestion of suggestions) {
          console.log(
            `    score=${suggestion.score.toFixed(4)} candidate=${suggestion.book.id} title="${suggestion.book.title}" authors="${suggestion.book.authors.join(', ')}" slug="${suggestion.book.slug}" archived=${suggestion.book.isArchived}`,
          );
        }
      }
    }

    const matchingConflicts = result.rows.filter((row) => row.status === 'CONFLICT');

    if (matchingConflicts.length > 0) {
      console.log('');
      console.log('MATCHING CONFLICTS');

      for (const row of matchingConflicts) {
        console.log('');
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}"`,
        );
        console.log(`    reason=${row.reason}`);
      }
    }

    const skipped = result.rows.filter((row) => row.status === 'SKIPPED');

    if (skipped.length > 0) {
      console.log('');
      console.log('SKIPPED');

      for (const row of skipped) {
        console.log(
          `- source=${row.source.sourceIndex} status=${row.source.status} title="${row.source.title}" author="${row.source.author ?? ''}" reason="${row.reason}"`,
        );
      }
    }

    console.log('');
    console.log('============================================================');
    console.log('AMAZON IMPORT PLAN — DRY-RUN');
    console.log('============================================================');

    console.log('');
    console.log('DATABASE');
    console.log(`Amazon channel ID: ${amazonChannel.id}`);
    console.log(`Existing Amazon products: ${existingAmazonProducts.length}`);

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

    const readyCreates = plan.rows.filter((row) => row.operation === 'READY_CREATE');

    if (readyCreates.length > 0) {
      console.log('');
      console.log('READY CREATE');

      for (const row of readyCreates) {
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
        );
        console.log(`    url="${row.source.purchaseUrl ?? ''}"`);
      }
    }

    const readyUpdates = plan.rows.filter((row) => row.operation === 'READY_UPDATE');

    if (readyUpdates.length > 0) {
      console.log('');
      console.log('READY UPDATE');

      for (const row of readyUpdates) {
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
        );

        console.log(`    existingExternalId="${row.existingProduct?.externalProductId ?? ''}"`);
        console.log(`    sourceExternalId="${row.source.asin ?? ''}"`);
        console.log(`    existingUrl="${row.existingProduct?.purchaseUrl ?? ''}"`);
        console.log(`    sourceUrl="${row.source.purchaseUrl ?? ''}"`);
        console.log(`    reason=${row.reason}`);
      }
    }

    const unchanged = plan.rows.filter((row) => row.operation === 'UNCHANGED');

    if (unchanged.length > 0) {
      console.log('');
      console.log('UNCHANGED');

      for (const row of unchanged) {
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
        );
      }
    }

    const planConflicts = plan.rows.filter((row) => row.operation === 'CONFLICT');

    if (planConflicts.length > 0) {
      console.log('');
      console.log('PLAN CONFLICTS');

      for (const row of planConflicts) {
        console.log('');
        console.log(
          `- source=${row.source.sourceIndex} asin=${row.source.asin ?? ''} title="${row.source.title}"`,
        );

        if (row.matchedBook) {
          console.log(`    book="${row.matchedBook.title}" (${row.matchedBook.id})`);
        }

        if (row.existingProduct) {
          console.log(
            `    existingProduct=${row.existingProduct.id} active=${row.existingProduct.isActive} status=${row.existingProduct.status}`,
          );

          console.log(`    existingExternalId="${row.existingProduct.externalProductId ?? ''}"`);

          console.log(`    existingUrl="${row.existingProduct.purchaseUrl ?? ''}"`);
        }

        console.log(`    sourceUrl="${row.source.purchaseUrl ?? ''}"`);
        console.log(`    reason=${row.reason}`);
      }
    }

    console.log('');
    console.log('No database writes performed.');
  } finally {
    await cleanupPilotRuntime();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Amazon matching/planner dry-run failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
