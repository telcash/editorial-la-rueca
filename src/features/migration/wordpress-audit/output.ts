import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { toCsv } from './csv';
import type { AuditResult } from './types';

export interface WriteAuditOutputOptions {
  outputDirectory: string;
  force?: boolean;
}

const OUTPUT_FILENAMES = [
  'migration-report.json',
  'model-gap-analysis.json',
  'pilot-sample.json',
  'post-types.csv',
  'authors-candidates.csv',
  'books-candidates.csv',
  'relationships-candidates.csv',
  'attachments-candidates.csv',
  'issues.csv',
];

export async function writeAuditOutput(result: AuditResult, options: WriteAuditOutputOptions) {
  await assertOutputDirectoryIsWritable(options.outputDirectory, Boolean(options.force));
  await mkdir(options.outputDirectory, { recursive: true });

  const files = new Map<string, string>([
    ['migration-report.json', JSON.stringify(result.report, null, 2)],
    ['model-gap-analysis.json', JSON.stringify(result.modelGapAnalysis, null, 2)],
    ['pilot-sample.json', JSON.stringify(result.pilotSample, null, 2)],
    ['post-types.csv', toCsv(result.postTypes, ['postType', 'count'])],
    [
      'authors-candidates.csv',
      toCsv(result.authors, [
        'candidateKey',
        'sourceWpPostId',
        'name',
        'normalizedName',
        'slug',
        'normalizedSlug',
        'oldUrl',
        'rawReview',
        'plainTextPreview',
        'bioCandidate',
        'thumbnailId',
        'thumbnailUrl',
        'imageFieldId',
        'imageFieldUrl',
        'status',
        'classification',
        'classificationReasons',
        'possibleDuplicateGroup',
        'reviewLikelyType',
        'reviewConfidence',
        'yoastMetaTitle',
        'yoastMetaDescription',
        'canonicalUrl',
      ]),
    ],
    [
      'books-candidates.csv',
      toCsv(result.books, [
        'candidateKey',
        'sourceWpPostId',
        'title',
        'normalizedTitle',
        'sourceAuthorTitle',
        'sourceAuthorSlug',
        'sourceOldUrl',
        'rawReview',
        'plainTextPreview',
        'videoId',
        'thumbnailId',
        'thumbnailUrl',
        'duplicateGroupId',
      ]),
    ],
    [
      'relationships-candidates.csv',
      toCsv(result.relationships, [
        'bookCandidateKey',
        'authorCandidateKey',
        'sourceWpPostId',
        'confidence',
        'reason',
      ]),
    ],
    [
      'attachments-candidates.csv',
      toCsv(result.attachments, [
        'wpPostId',
        'title',
        'slug',
        'url',
        'parentId',
        'mimeType',
        'width',
        'height',
        'attachedFile',
      ]),
    ],
    [
      'issues.csv',
      toCsv(result.issues, [
        'severity',
        'code',
        'entityType',
        'sourceWpPostId',
        'candidateKey',
        'message',
        'details',
      ]),
    ],
  ]);

  for (const filename of OUTPUT_FILENAMES) {
    const content = files.get(filename);

    if (content === undefined) {
      throw new Error(`Missing generated content for ${filename}.`);
    }

    await writeFile(path.join(options.outputDirectory, filename), `${content}\n`, 'utf8');
  }

  return OUTPUT_FILENAMES.map((filename) => path.join(options.outputDirectory, filename));
}

async function assertOutputDirectoryIsWritable(outputDirectory: string, force: boolean) {
  if (force) {
    return;
  }

  try {
    const entries = await readdir(outputDirectory);
    const conflictingEntries = entries.filter((entry) => OUTPUT_FILENAMES.includes(entry));

    if (conflictingEntries.length > 0) {
      throw new Error(
        `Output directory already contains audit files: ${conflictingEntries.join(
          ', ',
        )}. Re-run with --force to overwrite them.`,
      );
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}
