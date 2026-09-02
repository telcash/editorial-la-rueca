export type AmazonSourceStatus =
  'HAS_URL' | 'NO_URL' | 'NOT_APPROVED' | 'EXTERNAL_ACCOUNT' | 'REVIEW';

export interface AmazonSourceRecord {
  sourceIndex: number;
  title: string;
  author: string | null;
  purchaseUrl: string | null;
  asin: string | null;
  status: AmazonSourceStatus;
  note: string | null;
}

export interface AmazonAuditIssue {
  sourceIndex: number | null;
  code:
    | 'MISSING_TITLE'
    | 'MISSING_AUTHOR'
    | 'INVALID_AMAZON_URL'
    | 'DUPLICATE_URL'
    | 'DUPLICATE_ASIN'
    | 'DUPLICATE_NORMALIZED_TITLE'
    | 'UNPARSED_TEXT';
  message: string;
}

export interface AmazonAuditResult {
  filePath: string;
  records: AmazonSourceRecord[];
  issues: AmazonAuditIssue[];
  summary: {
    totalRecords: number;
    withUrl: number;
    withoutUrl: number;
    notApproved: number;
    externalAccount: number;
    review: number;
    duplicateUrls: number;
    duplicateAsins: number;
    duplicateNormalizedTitles: number;
  };
}
