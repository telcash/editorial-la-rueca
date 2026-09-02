import path from 'node:path';

import { parseQuaresWorkbook } from '@/features/quares-import/excel-parser';
import {
  loadQuaresManualMappings,
  validateQuaresManualMappings,
} from '@/features/quares-import/manual-mappings';
import { matchQuaresRows } from '@/features/quares-import/matcher';
import { findTitleSuggestions } from '@/features/quares-import/similarity';
import { normalizeBookTitle } from '@/features/quares-import/title-normalizer';
import { loadPilotCliEnv } from '@/features/migration/wordpress-pilot/env';
import { cleanupPilotRuntime } from '@/features/migration/wordpress-pilot/runtime-cleanup';

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

    const workbookPath = path.resolve(process.cwd(), 'data/imports/libros_quares.xlsx');

    const mappingsPath = path.resolve(
      process.cwd(),
      'data/import-decisions/quares-book-mappings.json',
    );

    const source = await parseQuaresWorkbook(workbookPath);

    if (source.issues.length > 0) {
      console.log('');
      console.log('QUARES IMPORT — DATABASE MATCHING DRY-RUN');
      console.log('');
      console.log(`Source validation failed with ${source.issues.length} issue(s).`);

      for (const issue of source.issues) {
        console.log(`- row=${issue.sourceRow} code=${issue.code}: ${issue.message}`);
      }

      throw new Error('Source workbook contains validation issues.');
    }

    const [books, quaresChannel] = await Promise.all([
      bookRepository.findAll('all'),
      salesRepository.findChannelBySlug('quares'),
    ]);

    if (!quaresChannel) {
      throw new Error('Quares sales channel was not found. Run the controlled sales seed first.');
    }

    const existingProducts = await salesRepository.findProductsByChannelId(quaresChannel.id);

    const bookCandidates = books.map((book) => ({
      id: book.id,
      title: book.title,
      normalizedTitle: normalizeBookTitle(book.title),
      slug: book.slug,
      isArchived: book.isArchived,
      authors: book.authors.map((author) => author.name),
    }));

    /*
     * Load and validate explicit manual decisions.
     *
     * The decision file is version-controlled and may only
     * reference Quares IDs present in this workbook and books
     * that currently exist in the catalog.
     */
    const manualConfiguration = await loadQuaresManualMappings(mappingsPath);

    const validatedMappings = validateQuaresManualMappings({
      configuration: manualConfiguration,
      sourceRows: source.rows,
      books: bookCandidates,
    });

    if (validatedMappings.issues.length > 0) {
      console.log('');
      console.log('MANUAL MAPPING ISSUES');

      for (const issue of validatedMappings.issues) {
        console.log(`- quares=${issue.externalProductId}: ${issue.reason}`);
      }

      throw new Error(
        `Manual mapping file contains ${validatedMappings.issues.length} invalid mapping(s).`,
      );
    }

    /*
     * Only products with a non-empty external product ID
     * participate in identity matching.
     */
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

    const result = matchQuaresRows({
      sourceRows: source.rows,
      books: bookCandidates,
      existingQuaresProducts: existingIdentities,
      manualMappings: validatedMappings.mappings,
      skippedExternalProductIds: validatedMappings.skippedExternalProductIds,
    });

    console.log('');
    console.log('============================================================');
    console.log('QUARES IMPORT — DATABASE MATCHING DRY-RUN');
    console.log('============================================================');

    console.log('');
    console.log('CATALOG');
    console.log(`Books loaded: ${books.length}`);
    console.log(`Existing Quares products: ${existingProducts.length}`);
    console.log(`Existing Quares products with external ID: ${existingIdentities.length}`);
    console.log(`Validated manual mappings: ${validatedMappings.mappings.size}`);
    console.log(`Validated manual skips: ${validatedMappings.skippedExternalProductIds.size}`);
    console.log('');
    console.log('MATCHING SUMMARY');
    console.log(`Source rows: ${result.summary.sourceRows}`);
    console.log(`Matched: ${result.summary.matched}`);
    console.log(`  by existing Quares ID: ${result.summary.matchedByExternalProductId}`);
    console.log(`  by exact normalized title: ${result.summary.matchedByExactTitle}`);
    console.log(`  by manual mapping: ${result.summary.matchedByManual}`);
    console.log(`Skipped: ${result.summary.skipped}`);
    console.log(`Ambiguous: ${result.summary.ambiguous}`);
    console.log(`Not found: ${result.summary.notFound}`);
    console.log(`Conflicts: ${result.summary.conflicts}`);

    const existingIdMatches = result.rows.filter(
      (row) => row.status === 'MATCHED' && row.matchMethod === 'EXTERNAL_PRODUCT_ID',
    );

    if (existingIdMatches.length > 0) {
      console.log('');
      console.log('MATCHED BY EXISTING QUARES ID');

      for (const row of existingIdMatches) {
        console.log(
          `- row=${row.source.sourceRow} quares=${row.source.externalProductId} source="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
        );
      }
    }

    const manualMatches = result.rows.filter(
      (row) => row.status === 'MATCHED' && row.matchMethod === 'MANUAL',
    );

    if (manualMatches.length > 0) {
      console.log('');
      console.log('MATCHED BY MANUAL MAPPING');

      for (const row of manualMatches) {
        console.log(
          `- row=${row.source.sourceRow} quares=${row.source.externalProductId} source="${row.source.title}" -> book="${row.matchedBook?.title ?? ''}" (${row.matchedBook?.id ?? ''})`,
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
          `- row=${row.source.sourceRow} quares=${row.source.externalProductId} source="${row.source.title}"`,
        );

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
        const suggestions = findTitleSuggestions(row.source.normalizedTitle, bookCandidates, 3);

        console.log('');
        console.log(
          `- row=${row.source.sourceRow} quares=${row.source.externalProductId} source="${row.source.title}"`,
        );

        for (const suggestion of suggestions) {
          console.log(
            `    score=${suggestion.score.toFixed(4)} candidate=${suggestion.book.id} title="${suggestion.book.title}" authors="${suggestion.book.authors.join(', ')}" slug="${suggestion.book.slug}" archived=${suggestion.book.isArchived}`,
          );
        }
      }
    }

    const conflicts = result.rows.filter((row) => row.status === 'CONFLICT');

    if (conflicts.length > 0) {
      console.log('');
      console.log('CONFLICTS');

      for (const row of conflicts) {
        console.log('');
        console.log(
          `- row=${row.source.sourceRow} quares=${row.source.externalProductId} source="${row.source.title}"`,
        );
        console.log(`    reason=${row.reason}`);

        for (const candidate of row.candidates) {
          console.log(
            `    candidate=${candidate.id} title="${candidate.title}" authors="${candidate.authors.join(', ')}" slug="${candidate.slug}" archived=${candidate.isArchived}`,
          );
        }
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
  console.error('Quares matching dry-run failed.');

  if (error instanceof Error) {
    console.error(error);
    console.error('Cause:', error.cause);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
