import type {
  QuaresBookCandidate,
  QuaresMatchedSourceRow,
  QuaresMatchingSummary,
  QuaresSourceRow,
} from './types';

interface ExistingQuaresProductIdentity {
  bookId: string;
  externalProductId: string;
}

interface ManualMapping {
  bookId: string;
  reason: string;
}

interface MatchQuaresRowsInput {
  sourceRows: QuaresSourceRow[];
  books: QuaresBookCandidate[];
  existingQuaresProducts: ExistingQuaresProductIdentity[];
  manualMappings?: Map<string, ManualMapping>;
  skippedExternalProductIds?: Set<string>;
}

interface MatchQuaresRowsResult {
  rows: QuaresMatchedSourceRow[];
  summary: QuaresMatchingSummary;
}

export function matchQuaresRows(input: MatchQuaresRowsInput): MatchQuaresRowsResult {
  const booksById = new Map(input.books.map((book) => [book.id, book]));

  const booksByNormalizedTitle = new Map<string, QuaresBookCandidate[]>();

  for (const book of input.books) {
    const current = booksByNormalizedTitle.get(book.normalizedTitle) ?? [];

    current.push(book);

    booksByNormalizedTitle.set(book.normalizedTitle, current);
  }

  const productsByExternalId = new Map<string, ExistingQuaresProductIdentity[]>();

  for (const product of input.existingQuaresProducts) {
    const externalProductId = product.externalProductId.trim();

    if (!externalProductId) {
      continue;
    }

    const current = productsByExternalId.get(externalProductId) ?? [];

    current.push({
      ...product,
      externalProductId,
    });

    productsByExternalId.set(externalProductId, current);
  }

  const rows: QuaresMatchedSourceRow[] = [];

  for (const source of input.sourceRows) {
    const existingProducts = productsByExternalId.get(source.externalProductId) ?? [];

    /*
     * Priority 1:
     * Existing database identity always wins.
     */
    if (existingProducts.length > 1) {
      const candidates = existingProducts
        .map((product) => booksById.get(product.bookId))
        .filter((book): book is QuaresBookCandidate => book !== undefined);

      rows.push({
        source,
        status: 'CONFLICT',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates,
        reason: 'Multiple existing Quares products use the same external product ID.',
      });

      continue;
    }

    if (existingProducts.length === 1) {
      const existingProduct = existingProducts[0];

      if (!existingProduct) {
        throw new Error('Unexpected missing existing Quares product.');
      }

      const book = booksById.get(existingProduct.bookId);

      if (!book) {
        rows.push({
          source,
          status: 'CONFLICT',
          matchMethod: 'NONE',
          matchedBook: null,
          candidates: [],
          reason:
            `Existing Quares product ${source.externalProductId} ` +
            `references missing book ${existingProduct.bookId}.`,
        });

        continue;
      }

      rows.push({
        source,
        status: 'MATCHED',
        matchMethod: 'EXTERNAL_PRODUCT_ID',
        matchedBook: book,
        candidates: [book],
        reason: 'Matched by existing Quares external product ID.',
      });

      continue;
    }

    /*
     * Priority 2:
     * Explicit SKIP decision.
     */
    if (input.skippedExternalProductIds?.has(source.externalProductId)) {
      rows.push({
        source,
        status: 'SKIPPED',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates: [],
        reason: 'Explicitly skipped by manual import decision.',
      });

      continue;
    }

    /*
     * Priority 3:
     * Explicit MAP decision.
     */
    const manualMapping = input.manualMappings?.get(source.externalProductId);

    if (manualMapping) {
      const manualBook = booksById.get(manualMapping.bookId);

      if (!manualBook) {
        rows.push({
          source,
          status: 'CONFLICT',
          matchMethod: 'NONE',
          matchedBook: null,
          candidates: [],
          reason: `Manual mapping references missing book ` + `${manualMapping.bookId}.`,
        });

        continue;
      }

      rows.push({
        source,
        status: 'MATCHED',
        matchMethod: 'MANUAL',
        matchedBook: manualBook,
        candidates: [manualBook],
        reason: `Manual mapping: ${manualMapping.reason}`,
      });

      continue;
    }

    /*
     * Priority 4:
     * Unique exact normalized title.
     *
     * Fuzzy/slug similarity remains diagnostic only.
     */
    const titleCandidates = booksByNormalizedTitle.get(source.normalizedTitle) ?? [];

    if (titleCandidates.length === 0) {
      rows.push({
        source,
        status: 'NOT_FOUND',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates: [],
        reason: 'No book has an exact normalized title match.',
      });

      continue;
    }

    if (titleCandidates.length > 1) {
      rows.push({
        source,
        status: 'AMBIGUOUS',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates: titleCandidates,
        reason: 'Multiple books have the same normalized title.',
      });

      continue;
    }

    const matchedBook = titleCandidates[0];

    if (!matchedBook) {
      throw new Error('Unexpected missing exact title candidate.');
    }

    rows.push({
      source,
      status: 'MATCHED',
      matchMethod: 'EXACT_NORMALIZED_TITLE',
      matchedBook,
      candidates: [matchedBook],
      reason: 'Matched by unique exact normalized title.',
    });
  }

  return {
    rows,
    summary: buildSummary(rows),
  };
}

function buildSummary(rows: QuaresMatchedSourceRow[]): QuaresMatchingSummary {
  return {
    sourceRows: rows.length,

    matched: rows.filter((row) => row.status === 'MATCHED').length,

    matchedByExternalProductId: rows.filter(
      (row) => row.status === 'MATCHED' && row.matchMethod === 'EXTERNAL_PRODUCT_ID',
    ).length,

    matchedByExactTitle: rows.filter(
      (row) => row.status === 'MATCHED' && row.matchMethod === 'EXACT_NORMALIZED_TITLE',
    ).length,

    matchedByManual: rows.filter((row) => row.status === 'MATCHED' && row.matchMethod === 'MANUAL')
      .length,

    skipped: rows.filter((row) => row.status === 'SKIPPED').length,

    ambiguous: rows.filter((row) => row.status === 'AMBIGUOUS').length,

    notFound: rows.filter((row) => row.status === 'NOT_FOUND').length,

    conflicts: rows.filter((row) => row.status === 'CONFLICT').length,
  };
}
