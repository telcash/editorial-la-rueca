import type { BookSalesProduct } from '@/db/schema';

import type { AmazonBookCandidate, AmazonMatchedSourceRecord } from './matcher';

export type AmazonImportOperation =
  | 'READY_CREATE'
  | 'READY_UPDATE'
  | 'UNCHANGED'
  | 'SKIPPED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'CONFLICT';

export interface AmazonImportPlanRow {
  source: AmazonMatchedSourceRecord['source'];
  matchedBook: AmazonBookCandidate | null;
  operation: AmazonImportOperation;
  reason: string;
  existingProduct: BookSalesProduct | null;
}

export interface AmazonImportPlanSummary {
  sourceRecords: number;
  readyCreate: number;
  readyUpdate: number;
  unchanged: number;
  skipped: number;
  ambiguous: number;
  notFound: number;
  conflicts: number;
}

export interface AmazonImportPlan {
  rows: AmazonImportPlanRow[];
  summary: AmazonImportPlanSummary;
}

export interface BuildAmazonImportPlanInput {
  matchedRows: AmazonMatchedSourceRecord[];
  existingAmazonProducts: BookSalesProduct[];
}

function normalizeUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeExternalProductId(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized ? normalized.toUpperCase() : null;
}

export function buildAmazonImportPlan({
  matchedRows,
  existingAmazonProducts,
}: BuildAmazonImportPlanInput): AmazonImportPlan {
  const existingByBookId = new Map(
    existingAmazonProducts.map((product) => [product.bookId, product] as const),
  );

  /*
   * Current schema invariant:
   *
   * UNIQUE(book_id, sales_channel_id)
   *
   * Therefore a single internal book cannot receive multiple Amazon
   * listings. If several source records match the same internal book,
   * all of those source rows must remain blocked for manual review.
   */
  const matchedRowsByBookId = new Map<string, AmazonMatchedSourceRecord[]>();

  for (const row of matchedRows) {
    if (row.status !== 'MATCHED' || !row.matchedBook) {
      continue;
    }

    const rowsForBook = matchedRowsByBookId.get(row.matchedBook.id) ?? [];

    rowsForBook.push(row);
    matchedRowsByBookId.set(row.matchedBook.id, rowsForBook);
  }

  const duplicateMatchedBookIds = new Set(
    Array.from(matchedRowsByBookId.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([bookId]) => bookId),
  );

  const rows: AmazonImportPlanRow[] = matchedRows.map((row) => {
    const existingProduct = row.matchedBook
      ? (existingByBookId.get(row.matchedBook.id) ?? null)
      : null;

    const base = {
      source: row.source,
      matchedBook: row.matchedBook,
      existingProduct,
    };

    if (row.status === 'SKIPPED') {
      return {
        ...base,
        operation: 'SKIPPED',
        reason: row.reason,
      } satisfies AmazonImportPlanRow;
    }

    if (row.status === 'AMBIGUOUS') {
      return {
        ...base,
        operation: 'AMBIGUOUS',
        reason: row.reason,
      } satisfies AmazonImportPlanRow;
    }

    if (row.status === 'NOT_FOUND') {
      return {
        ...base,
        operation: 'NOT_FOUND',
        reason: row.reason,
      } satisfies AmazonImportPlanRow;
    }

    if (row.status === 'CONFLICT') {
      return {
        ...base,
        operation: 'CONFLICT',
        reason: row.reason,
      } satisfies AmazonImportPlanRow;
    }

    if (row.status !== 'MATCHED' || !row.matchedBook) {
      return {
        ...base,
        operation: 'CONFLICT',
        reason: 'Unexpected Amazon matching state.',
      } satisfies AmazonImportPlanRow;
    }

    if (!row.source.purchaseUrl) {
      return {
        ...base,
        operation: 'CONFLICT',
        reason: 'Matched Amazon source does not contain a purchase URL.',
      } satisfies AmazonImportPlanRow;
    }

    if (!row.source.asin) {
      return {
        ...base,
        operation: 'CONFLICT',
        reason: 'Matched Amazon source does not contain an ASIN.',
      } satisfies AmazonImportPlanRow;
    }

    /*
     * Never choose automatically between multiple Amazon listings
     * targeting the same internal book.
     */
    if (duplicateMatchedBookIds.has(row.matchedBook.id)) {
      const competingRows = matchedRowsByBookId.get(row.matchedBook.id) ?? [];

      const identities = competingRows
        .map(
          (item) =>
            item.source.asin ?? item.source.purchaseUrl ?? `source:${item.source.sourceIndex}`,
        )
        .join(', ');

      return {
        ...base,
        operation: 'CONFLICT',
        reason:
          `Multiple Amazon source records target the same internal book: ${identities}. ` +
          'Manual review required.',
      } satisfies AmazonImportPlanRow;
    }

    if (!existingProduct) {
      return {
        ...base,
        operation: 'READY_CREATE',
        reason: 'No existing Amazon product for this book.',
      } satisfies AmazonImportPlanRow;
    }

    /*
     * Existing manually-disabled or non-available products are not
     * silently reactivated by the importer.
     */
    if (!existingProduct.isActive || existingProduct.status !== 'available') {
      return {
        ...base,
        operation: 'CONFLICT',
        reason: 'Existing Amazon product is inactive or has a non-available status.',
      } satisfies AmazonImportPlanRow;
    }

    const sourceUrl = normalizeUrl(row.source.purchaseUrl);
    const existingUrl = normalizeUrl(existingProduct.purchaseUrl);

    const sourceAsin = normalizeExternalProductId(row.source.asin);
    const existingExternalId = normalizeExternalProductId(existingProduct.externalProductId);

    /*
     * A pre-existing non-empty purchase URL is considered authoritative.
     * Never silently replace it with another Amazon URL.
     */
    if (existingUrl && existingUrl !== sourceUrl) {
      return {
        ...base,
        operation: 'CONFLICT',
        reason:
          `Existing Amazon purchase URL differs from source. ` +
          `Existing="${existingUrl}" source="${sourceUrl}".`,
      } satisfies AmazonImportPlanRow;
    }

    /*
     * Same protection for external identity / ASIN.
     */
    if (existingExternalId && sourceAsin && existingExternalId !== sourceAsin) {
      return {
        ...base,
        operation: 'CONFLICT',
        reason:
          `Existing Amazon externalProductId differs from source ASIN. ` +
          `Existing="${existingExternalId}" source="${sourceAsin}".`,
      } satisfies AmazonImportPlanRow;
    }

    const purchaseUrlNeedsUpdate = existingUrl !== sourceUrl;
    const externalProductIdNeedsUpdate = existingExternalId !== sourceAsin;

    if (purchaseUrlNeedsUpdate || externalProductIdNeedsUpdate) {
      return {
        ...base,
        operation: 'READY_UPDATE',
        reason: 'Existing Amazon product can be safely completed with source data.',
      } satisfies AmazonImportPlanRow;
    }

    return {
      ...base,
      operation: 'UNCHANGED',
      reason: 'Existing Amazon product already matches source data.',
    } satisfies AmazonImportPlanRow;
  });

  return {
    rows,
    summary: {
      sourceRecords: rows.length,
      readyCreate: rows.filter((row) => row.operation === 'READY_CREATE').length,
      readyUpdate: rows.filter((row) => row.operation === 'READY_UPDATE').length,
      unchanged: rows.filter((row) => row.operation === 'UNCHANGED').length,
      skipped: rows.filter((row) => row.operation === 'SKIPPED').length,
      ambiguous: rows.filter((row) => row.operation === 'AMBIGUOUS').length,
      notFound: rows.filter((row) => row.operation === 'NOT_FOUND').length,
      conflicts: rows.filter((row) => row.operation === 'CONFLICT').length,
    },
  };
}
