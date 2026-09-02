export const QUARES_COUNTRY_CODES = [
  'ES',
  'MX',
  'US',
  'EC',
  'AR',
  'CL',
  'CR',
  'CO',
  'BO',
  'GT',
  'VE',
] as const;

export type QuaresCountryCode = (typeof QUARES_COUNTRY_CODES)[number];

/*
 * --------------------------------------------------------------------------
 * SOURCE / EXCEL PARSING
 * --------------------------------------------------------------------------
 */

export interface QuaresSourceRow {
  sourceRow: number;
  externalProductId: string;
  title: string;
  normalizedTitle: string;
  marketCountryCodes: QuaresCountryCode[];
}

export type QuaresRowIssueCode =
  | 'MISSING_EXTERNAL_PRODUCT_ID'
  | 'MISSING_TITLE'
  | 'INVALID_MARKET_VALUE'
  | 'DUPLICATE_EXTERNAL_PRODUCT_ID';

export interface QuaresRowIssue {
  sourceRow: number;
  code: QuaresRowIssueCode;
  message: string;
  column?: string;
  value?: string;
}

export interface QuaresDuplicateNormalizedTitle {
  normalizedTitle: string;
  rows: Array<{
    sourceRow: number;
    externalProductId: string;
    title: string;
  }>;
}

export interface QuaresParsedWorkbook {
  filePath: string;
  sheetName: string;
  totalSourceRows: number;
  rows: QuaresSourceRow[];
  issues: QuaresRowIssue[];
  duplicateExternalProductIds: string[];
  duplicateNormalizedTitles: QuaresDuplicateNormalizedTitle[];
}

/*
 * --------------------------------------------------------------------------
 * BOOK MATCHING
 * --------------------------------------------------------------------------
 */

export interface QuaresBookCandidate {
  id: string;
  title: string;
  normalizedTitle: string;
  slug: string;
  isArchived: boolean;
  authors: string[];
}

export type QuaresMatchMethod =
  'EXTERNAL_PRODUCT_ID' | 'EXACT_NORMALIZED_TITLE' | 'MANUAL' | 'NONE';

export type QuaresMatchStatus = 'MATCHED' | 'SKIPPED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'CONFLICT';

export interface QuaresMatchedSourceRow {
  source: QuaresSourceRow;
  status: QuaresMatchStatus;
  matchMethod: QuaresMatchMethod;
  matchedBook: QuaresBookCandidate | null;
  candidates: QuaresBookCandidate[];
  reason: string;
}

export interface QuaresMatchingSummary {
  sourceRows: number;
  matched: number;
  matchedByExternalProductId: number;
  matchedByExactTitle: number;
  matchedByManual: number;
  skipped: number;
  ambiguous: number;
  notFound: number;
  conflicts: number;
}
