import { normalizeBookTitle } from '@/features/quares-import/title-normalizer';

import type { AmazonSourceRecord } from './types';

export interface AmazonBookCandidate {
  id: string;
  title: string;
  normalizedTitle: string;
  slug: string;
  isArchived: boolean;
  authors: string[];
}

export type AmazonMatchMethod = 'EXACT_NORMALIZED_TITLE' | 'MANUAL' | 'NONE';

export type AmazonMatchStatus = 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'SKIPPED' | 'CONFLICT';

export interface AmazonManualMapping {
  asin: string;
  action: 'MAP' | 'SKIP';
  bookId?: string;
  reason: string;
}

export interface AmazonMatchedSourceRecord {
  source: AmazonSourceRecord;
  status: AmazonMatchStatus;
  matchMethod: AmazonMatchMethod;
  matchedBook: AmazonBookCandidate | null;
  candidates: AmazonBookCandidate[];
  reason: string;
}

export interface AmazonMatchingSummary {
  sourceRecords: number;
  matched: number;
  matchedByExactTitle: number;
  matchedByManual: number;
  skipped: number;
  ambiguous: number;
  notFound: number;
  conflicts: number;
}

export interface MatchAmazonSourceInput {
  sourceRecords: AmazonSourceRecord[];
  books: AmazonBookCandidate[];
  manualMappings?: AmazonManualMapping[];
}

export function matchAmazonSource({
  sourceRecords,
  books,
  manualMappings = [],
}: MatchAmazonSourceInput): {
  rows: AmazonMatchedSourceRecord[];
  summary: AmazonMatchingSummary;
} {
  const booksByNormalizedTitle = new Map<string, AmazonBookCandidate[]>();

  const booksById = new Map(books.map((book) => [book.id, book] as const));

  for (const book of books) {
    const group = booksByNormalizedTitle.get(book.normalizedTitle) ?? [];

    group.push(book);
    booksByNormalizedTitle.set(book.normalizedTitle, group);
  }

  const mappingsByAsin = new Map(
    manualMappings.map((mapping) => [mapping.asin.toUpperCase(), mapping] as const),
  );

  const rows: AmazonMatchedSourceRecord[] = sourceRecords.map((source) => {
    /*
     * These records do not represent an Amazon product that
     * should be imported into our own commercial configuration.
     */
    if (source.status === 'NOT_APPROVED' || source.status === 'EXTERNAL_ACCOUNT') {
      return {
        source,
        status: 'SKIPPED',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates: [],
        reason: `Source status is ${source.status}.`,
      };
    }

    /*
     * Without a purchase URL there is nothing to import.
     */
    if (!source.purchaseUrl) {
      return {
        source,
        status: 'SKIPPED',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates: [],
        reason: 'Amazon purchase URL is missing.',
      };
    }

    const manualMapping = source.asin ? mappingsByAsin.get(source.asin.toUpperCase()) : undefined;

    if (manualMapping) {
      if (manualMapping.action === 'SKIP') {
        return {
          source,
          status: 'SKIPPED',
          matchMethod: 'MANUAL',
          matchedBook: null,
          candidates: [],
          reason: manualMapping.reason,
        };
      }

      if (!manualMapping.bookId) {
        return {
          source,
          status: 'CONFLICT',
          matchMethod: 'MANUAL',
          matchedBook: null,
          candidates: [],
          reason: 'Manual MAP decision does not contain a bookId.',
        };
      }

      const book = booksById.get(manualMapping.bookId);

      if (!book) {
        return {
          source,
          status: 'CONFLICT',
          matchMethod: 'MANUAL',
          matchedBook: null,
          candidates: [],
          reason: `Manual mapping references unknown book ${manualMapping.bookId}.`,
        };
      }

      return {
        source,
        status: 'MATCHED',
        matchMethod: 'MANUAL',
        matchedBook: book,
        candidates: [book],
        reason: manualMapping.reason,
      };
    }

    const normalizedTitle = normalizeBookTitle(source.title);
    const candidates = booksByNormalizedTitle.get(normalizedTitle) ?? [];

    if (candidates.length === 1) {
      return {
        source,
        status: 'MATCHED',
        matchMethod: 'EXACT_NORMALIZED_TITLE',
        matchedBook: candidates[0]!,
        candidates,
        reason: 'Unique exact normalized title match.',
      };
    }

    if (candidates.length > 1) {
      return {
        source,
        status: 'AMBIGUOUS',
        matchMethod: 'NONE',
        matchedBook: null,
        candidates,
        reason: 'Multiple internal books have the same normalized title.',
      };
    }

    return {
      source,
      status: 'NOT_FOUND',
      matchMethod: 'NONE',
      matchedBook: null,
      candidates: [],
      reason: 'No exact normalized title match.',
    };
  });

  return {
    rows,
    summary: {
      sourceRecords: rows.length,

      matched: rows.filter((row) => row.status === 'MATCHED').length,

      matchedByExactTitle: rows.filter(
        (row) => row.status === 'MATCHED' && row.matchMethod === 'EXACT_NORMALIZED_TITLE',
      ).length,

      matchedByManual: rows.filter(
        (row) => row.status === 'MATCHED' && row.matchMethod === 'MANUAL',
      ).length,

      skipped: rows.filter((row) => row.status === 'SKIPPED').length,

      ambiguous: rows.filter((row) => row.status === 'AMBIGUOUS').length,

      notFound: rows.filter((row) => row.status === 'NOT_FOUND').length,

      conflicts: rows.filter((row) => row.status === 'CONFLICT').length,
    },
  };
}
