import type { QuaresMatchedSourceRow, QuaresCountryCode } from './types';

export type QuaresImportOperation =
  | 'READY_CREATE'
  | 'READY_UPDATE'
  | 'UNCHANGED'
  | 'SKIPPED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID';

export interface QuaresPlannerProduct {
  id: string;
  bookId: string;
  externalProductId: string | null;
  status: string;
  isActive: boolean;
}

export interface QuaresPlannerMarket {
  id: string;
  countryCode: string | null;
  isActive: boolean;
}

export interface QuaresImportPlanRow {
  sourceRow: number;
  externalProductId: string;
  sourceTitle: string;

  operation: QuaresImportOperation;
  reason: string;

  matchMethod: string;

  bookId: string | null;
  bookTitle: string | null;

  currentExternalProductId: string | null;
  currentMarketCountryCodes: string[];
  desiredMarketCountryCodes: QuaresCountryCode[];

  desiredMarketIds: string[];
}

export interface QuaresImportPlanSummary {
  sourceRows: number;
  readyCreate: number;
  readyUpdate: number;
  unchanged: number;
  skipped: number;
  ambiguous: number;
  notFound: number;
  conflicts: number;
  invalid: number;
}

export interface QuaresImportPlan {
  rows: QuaresImportPlanRow[];
  summary: QuaresImportPlanSummary;
}

interface BuildQuaresImportPlanInput {
  matchedRows: QuaresMatchedSourceRow[];
  existingProducts: QuaresPlannerProduct[];
  availabilityByProductId: Map<string, string[]>;
  markets: QuaresPlannerMarket[];
}

export function buildQuaresImportPlan(input: BuildQuaresImportPlanInput): QuaresImportPlan {
  const productsByBookId = new Map<string, QuaresPlannerProduct[]>();

  for (const product of input.existingProducts) {
    const current = productsByBookId.get(product.bookId) ?? [];

    current.push(product);
    productsByBookId.set(product.bookId, current);
  }

  const marketsByCountryCode = new Map<string, QuaresPlannerMarket>();

  const marketsById = new Map<string, QuaresPlannerMarket>();

  for (const market of input.markets) {
    marketsById.set(market.id, market);

    if (market.countryCode) {
      marketsByCountryCode.set(market.countryCode, market);
    }
  }

  /*
   * Current schema allows only one Quares product
   * per internal book. Detect multiple source rows
   * that would attempt to use the same book.
   */
  const sourceIdsByBookId = new Map<string, Set<string>>();

  for (const row of input.matchedRows) {
    if (row.status !== 'MATCHED' || !row.matchedBook) {
      continue;
    }

    const ids = sourceIdsByBookId.get(row.matchedBook.id) ?? new Set<string>();

    ids.add(row.source.externalProductId);

    sourceIdsByBookId.set(row.matchedBook.id, ids);
  }

  const rows: QuaresImportPlanRow[] = input.matchedRows.map((row) => {
    const base = {
      sourceRow: row.source.sourceRow,
      externalProductId: row.source.externalProductId,
      sourceTitle: row.source.title,
      matchMethod: row.matchMethod,
      bookId: row.matchedBook?.id ?? null,
      bookTitle: row.matchedBook?.title ?? null,
      currentExternalProductId: null,
      currentMarketCountryCodes: [],
      desiredMarketCountryCodes: row.source.marketCountryCodes,
      desiredMarketIds: [],
    };

    if (row.status !== 'MATCHED') {
      return {
        ...base,
        operation: row.status,
        reason: row.reason,
      } satisfies QuaresImportPlanRow;
    }

    if (!row.matchedBook) {
      return {
        ...base,
        operation: 'INVALID',
        reason: 'Matched row does not contain a book.',
      } satisfies QuaresImportPlanRow;
    }

    const sourceIds = sourceIdsByBookId.get(row.matchedBook.id);

    if (sourceIds && sourceIds.size > 1) {
      return {
        ...base,
        operation: 'SKIPPED',
        reason:
          `Manual review required: multiple Quares IDs target the same internal book: ` +
          Array.from(sourceIds).join(', '),
      } satisfies QuaresImportPlanRow;
    }

    const desiredMarkets: QuaresPlannerMarket[] = [];

    for (const countryCode of row.source.marketCountryCodes) {
      const market = marketsByCountryCode.get(countryCode);

      if (!market) {
        return {
          ...base,
          operation: 'INVALID',
          reason: `Quares market ${countryCode} does not exist.`,
        } satisfies QuaresImportPlanRow;
      }

      if (!market.isActive) {
        return {
          ...base,
          operation: 'INVALID',
          reason: `Quares market ${countryCode} is inactive.`,
        } satisfies QuaresImportPlanRow;
      }

      desiredMarkets.push(market);
    }

    const desiredMarketIds = desiredMarkets.map((market) => market.id);

    const existingForBook = productsByBookId.get(row.matchedBook.id) ?? [];

    if (existingForBook.length > 1) {
      return {
        ...base,
        desiredMarketIds,
        operation: 'CONFLICT',
        reason: 'Multiple existing Quares products exist for this book.',
      } satisfies QuaresImportPlanRow;
    }

    const existing = existingForBook[0];

    if (!existing) {
      return {
        ...base,
        desiredMarketIds,
        operation: 'READY_CREATE',
        reason: 'No existing Quares product exists for the matched book.',
      } satisfies QuaresImportPlanRow;
    }

    const currentMarketIds = input.availabilityByProductId.get(existing.id) ?? [];

    const unknownMarketId = currentMarketIds.find((marketId) => !marketsById.has(marketId));

    if (unknownMarketId) {
      return {
        ...base,
        currentExternalProductId: existing.externalProductId,
        desiredMarketIds,
        operation: 'CONFLICT',
        reason: `Existing product references unknown market ${unknownMarketId}.`,
      } satisfies QuaresImportPlanRow;
    }

    const currentMarketCountryCodes = currentMarketIds
      .map((marketId) => marketsById.get(marketId)?.countryCode)
      .filter((value): value is string => Boolean(value))
      .sort();

    if (!existing.isActive || existing.status !== 'available') {
      return {
        ...base,
        currentExternalProductId: existing.externalProductId,
        currentMarketCountryCodes,
        desiredMarketIds,
        operation: 'CONFLICT',
        reason: `Existing Quares product is manually inactive or has status "${existing.status}".`,
      } satisfies QuaresImportPlanRow;
    }

    const currentExternalProductId = existing.externalProductId?.trim() ?? '';

    if (currentExternalProductId && currentExternalProductId !== row.source.externalProductId) {
      return {
        ...base,
        currentExternalProductId: existing.externalProductId,
        currentMarketCountryCodes,
        desiredMarketIds,
        operation: 'CONFLICT',
        reason: `Existing Quares ID ${currentExternalProductId} differs from source ID ${row.source.externalProductId}.`,
      } satisfies QuaresImportPlanRow;
    }

    const desiredCodes = [...row.source.marketCountryCodes].sort();

    const sameMarkets =
      currentMarketCountryCodes.length === desiredCodes.length &&
      currentMarketCountryCodes.every((value, index) => value === desiredCodes[index]);

    const sameExternalId = currentExternalProductId === row.source.externalProductId;

    if (sameMarkets && sameExternalId) {
      return {
        ...base,
        currentExternalProductId: existing.externalProductId,
        currentMarketCountryCodes,
        desiredMarketIds,
        operation: 'UNCHANGED',
        reason: 'Quares ID and market availability already match the source.',
      } satisfies QuaresImportPlanRow;
    }

    return {
      ...base,
      currentExternalProductId: existing.externalProductId,
      currentMarketCountryCodes,
      desiredMarketIds,
      operation: 'READY_UPDATE',
      reason: 'Existing Quares product requires ID and/or market synchronization.',
    } satisfies QuaresImportPlanRow;
  });

  return {
    rows,
    summary: {
      sourceRows: rows.length,
      readyCreate: count(rows, 'READY_CREATE'),
      readyUpdate: count(rows, 'READY_UPDATE'),
      unchanged: count(rows, 'UNCHANGED'),
      skipped: count(rows, 'SKIPPED'),
      ambiguous: count(rows, 'AMBIGUOUS'),
      notFound: count(rows, 'NOT_FOUND'),
      conflicts: count(rows, 'CONFLICT'),
      invalid: count(rows, 'INVALID'),
    },
  };
}

function count(rows: QuaresImportPlanRow[], operation: QuaresImportOperation): number {
  return rows.filter((row) => row.operation === operation).length;
}
