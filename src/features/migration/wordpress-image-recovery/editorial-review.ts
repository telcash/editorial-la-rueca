import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  BookCoverAdjudicationCandidate,
  BookCoverAdjudicationItem,
} from './book-cover-adjudication';

export type EditorialReviewDecision = 'approved' | 'rejected' | 'manual';
export type EditorialReviewSelectionSource = 'algorithm' | 'editorial-manual' | 'none';

export interface EditorialReviewImage {
  groupKey: string;
  url: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  positiveCoverScore: number;
  negativeAuthorScore: number;
  finalScore: number;
  origins: string[];
  isAlgorithmSuggestion: boolean;
}

export interface EditorialReviewDecisionRecord {
  candidateKey: string;
  decision: EditorialReviewDecision;
  algorithmSuggestion: EditorialReviewImage | null;
  selectedImage: EditorialReviewImage | null;
  selectionSource: EditorialReviewSelectionSource;
  updatedAt: string | null;
}

export interface EditorialReviewEntry {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  author: string;
  proposedDecision: EditorialReviewDecision;
  adjudicationDecision: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  winnerGroupKey: string | null;
  winnerUrl: string | null;
  winnerFilename: string | null;
  positiveCoverScore: number;
  negativeAuthorScore: number;
  finalScore: number;
  winnerGap: number | null;
  algorithmSuggestion: EditorialReviewImage | null;
  initialSelectedImage: EditorialReviewImage | null;
  candidateImages: EditorialReviewImage[];
  explanation: string[];
  discardedCandidates: BookCoverAdjudicationCandidate[];
  candidates: BookCoverAdjudicationCandidate[];
}

export interface EditorialReviewStatistics {
  generatedAt: string;
  total: number;
  pending: number;
  approved: number;
  approvedWithAlgorithm: number;
  manuallyCorrected: number;
  rejected: number;
  manual: number;
  confidenceDistribution: Record<'high' | 'medium' | 'low' | 'none', number>;
  averagePositiveCoverScore: number;
  averageNegativeAuthorScore: number;
  averageWinnerGap: number;
}

export interface EditorialReview {
  generatedAt: string;
  entries: EditorialReviewEntry[];
  decisions: EditorialReviewDecisionRecord[];
  approved: EditorialReviewDecisionRecord[];
  rejected: EditorialReviewDecisionRecord[];
  manual: EditorialReviewDecisionRecord[];
  statistics: EditorialReviewStatistics;
}

export async function createEditorialReview(params: {
  massDirectory: string;
}): Promise<EditorialReview> {
  const outputDirectory = path.join(path.resolve(params.massDirectory), 'image-recovery');
  const [adjudication, safeBookCovers, ambiguousBookCovers] = await Promise.all([
    readJson<BookCoverAdjudicationItem[]>(
      path.join(outputDirectory, 'book-cover-adjudication.json'),
    ),
    readJson<BookCoverAdjudicationItem[]>(path.join(outputDirectory, 'safe-book-covers.json')),
    readJson<BookCoverAdjudicationItem[]>(path.join(outputDirectory, 'ambiguous-book-covers.json')),
  ]);
  const knownKeys = new Set(
    [...safeBookCovers, ...ambiguousBookCovers].map((item) => item.candidateKey),
  );
  const entries = adjudication.map((item) => createReviewEntry(item, knownKeys));
  const decisions = entries.map((entry) => createInitialEditorialReviewDecision(entry));
  const approved = decisions.filter((decision) => decision.decision === 'approved');
  const rejected = decisions.filter((decision) => decision.decision === 'rejected');
  const manual = decisions.filter((decision) => decision.decision === 'manual');
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    entries,
    decisions,
    approved,
    rejected,
    manual,
    statistics: createStatistics(generatedAt, entries, decisions),
  };
}

function createReviewEntry(
  item: BookCoverAdjudicationItem,
  knownKeys: Set<string>,
): EditorialReviewEntry {
  const winner = item.candidates.find((candidate) => candidate.isWinner) ?? item.candidates[0];
  const proposedDecision = proposedDecisionFor(item);
  const candidateImages = item.candidates.map((candidate) =>
    createReviewImage(candidate, candidate.groupKey === winner?.groupKey),
  );
  const algorithmSuggestion =
    candidateImages.find((image) => image.isAlgorithmSuggestion) ?? candidateImages[0] ?? null;

  return {
    candidateKey: item.candidateKey,
    sourceWpPostId: item.sourceWpPostId,
    title: item.title,
    author: item.author,
    proposedDecision,
    adjudicationDecision: item.decision,
    confidence: confidenceFor(item, knownKeys),
    winnerGroupKey: item.winnerGroupKey,
    winnerUrl: winner?.urls[0] ?? null,
    winnerFilename: winner?.filenames[0] ?? null,
    positiveCoverScore: winner?.positiveCoverScore ?? 0,
    negativeAuthorScore: winner?.negativeAuthorScore ?? 0,
    finalScore: winner?.finalScore ?? 0,
    winnerGap: item.winnerGap,
    algorithmSuggestion,
    initialSelectedImage: algorithmSuggestion,
    candidateImages,
    explanation: item.decisionReasons,
    discardedCandidates: item.candidates.filter((candidate) => !candidate.isWinner),
    candidates: item.candidates,
  };
}

export function createInitialEditorialReviewDecision(
  entry: EditorialReviewEntry,
): EditorialReviewDecisionRecord {
  return {
    candidateKey: entry.candidateKey,
    decision: entry.proposedDecision,
    algorithmSuggestion: entry.algorithmSuggestion,
    selectedImage: entry.initialSelectedImage,
    selectionSource: entry.proposedDecision === 'approved' ? 'algorithm' : 'none',
    updatedAt: null,
  };
}

export function selectEditorialReviewImage(
  record: EditorialReviewDecisionRecord,
  selectedImage: EditorialReviewImage,
): EditorialReviewDecisionRecord {
  return {
    ...record,
    selectedImage,
    selectionSource:
      record.decision === 'approved'
        ? selectionSourceFor(record.algorithmSuggestion, selectedImage)
        : record.selectionSource,
  };
}

export function applyEditorialReviewDecision(
  record: EditorialReviewDecisionRecord,
  decision: EditorialReviewDecision,
): EditorialReviewDecisionRecord {
  if (decision !== 'approved') {
    return {
      ...record,
      decision,
      selectedImage: null,
      selectionSource: 'none',
    };
  }

  const selectedImage = record.selectedImage ?? record.algorithmSuggestion;

  return {
    ...record,
    decision,
    selectedImage,
    selectionSource: selectionSourceFor(record.algorithmSuggestion, selectedImage),
  };
}

export function serializeEditorialReviewDecisions(
  decisions: EditorialReviewDecisionRecord[],
  generatedAt: string,
) {
  return {
    schemaVersion: 1,
    generatedAt,
    decisions,
    statistics: createDecisionStatistics(generatedAt, decisions),
  };
}

export function restoreEditorialReviewDecisions(
  entries: EditorialReviewEntry[],
  imported: unknown,
): EditorialReviewDecisionRecord[] {
  const entriesByKey = new Map(entries.map((entry) => [entry.candidateKey, entry]));
  const initialByKey = new Map(
    entries.map((entry) => [entry.candidateKey, createInitialEditorialReviewDecision(entry)]),
  );
  const importedRecords = parseImportedDecisionRecords(imported);

  for (const importedRecord of importedRecords) {
    const entry = entriesByKey.get(importedRecord.candidateKey);
    const initial = initialByKey.get(importedRecord.candidateKey);

    if (!entry || !initial) {
      continue;
    }

    const selectedImage = importedRecord.selectedImage?.groupKey
      ? (entry.candidateImages.find(
          (image) => image.groupKey === importedRecord.selectedImage?.groupKey,
        ) ?? null)
      : null;

    initialByKey.set(
      importedRecord.candidateKey,
      applyEditorialReviewDecision(
        {
          ...initial,
          selectedImage,
        },
        importedRecord.decision,
      ),
    );
  }

  return [...initialByKey.values()];
}

function createReviewImage(
  candidate: BookCoverAdjudicationCandidate,
  isAlgorithmSuggestion: boolean,
): EditorialReviewImage {
  return {
    groupKey: candidate.groupKey,
    url: candidate.urls[0] ?? null,
    filename: candidate.filenames[0] ?? null,
    width: candidate.width,
    height: candidate.height,
    positiveCoverScore: candidate.positiveCoverScore,
    negativeAuthorScore: candidate.negativeAuthorScore,
    finalScore: candidate.finalScore,
    origins: candidate.origins,
    isAlgorithmSuggestion,
  };
}

function selectionSourceFor(
  algorithmSuggestion: EditorialReviewImage | null,
  selectedImage: EditorialReviewImage | null,
): EditorialReviewSelectionSource {
  if (!selectedImage) {
    return 'none';
  }

  return algorithmSuggestion?.groupKey === selectedImage.groupKey
    ? 'algorithm'
    : 'editorial-manual';
}

function proposedDecisionFor(item: BookCoverAdjudicationItem): EditorialReviewDecision {
  if (item.decision === 'safe_book_cover') {
    return 'approved';
  }

  if (item.decision === 'no_safe_candidate') {
    return 'rejected';
  }

  return 'manual';
}

function confidenceFor(
  item: BookCoverAdjudicationItem,
  knownKeys: Set<string>,
): EditorialReviewEntry['confidence'] {
  if (item.decision === 'safe_book_cover') {
    return knownKeys.has(item.candidateKey) ? 'high' : 'medium';
  }

  if (item.decision === 'ambiguous') {
    return 'low';
  }

  return 'none';
}

function createStatistics(
  generatedAt: string,
  entries: EditorialReviewEntry[],
  decisions: EditorialReviewDecisionRecord[],
): EditorialReviewStatistics {
  const decisionStatistics = createDecisionStatistics(generatedAt, decisions);

  return {
    generatedAt,
    total: entries.length,
    pending: decisionStatistics.pending,
    approved: decisionStatistics.approved,
    approvedWithAlgorithm: decisionStatistics.approvedWithAlgorithm,
    manuallyCorrected: decisionStatistics.manuallyCorrected,
    rejected: decisionStatistics.rejected,
    manual: decisionStatistics.manual,
    confidenceDistribution: {
      high: entries.filter((entry) => entry.confidence === 'high').length,
      medium: entries.filter((entry) => entry.confidence === 'medium').length,
      low: entries.filter((entry) => entry.confidence === 'low').length,
      none: entries.filter((entry) => entry.confidence === 'none').length,
    },
    averagePositiveCoverScore: average(entries.map((entry) => entry.positiveCoverScore)),
    averageNegativeAuthorScore: average(entries.map((entry) => entry.negativeAuthorScore)),
    averageWinnerGap: average(
      entries.map((entry) => entry.winnerGap).filter((value): value is number => value !== null),
    ),
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return (
    Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100
  );
}

function createDecisionStatistics(generatedAt: string, decisions: EditorialReviewDecisionRecord[]) {
  return {
    generatedAt,
    total: decisions.length,
    pending: decisions.filter((decision) => !decision.decision).length,
    approved: decisions.filter((decision) => decision.decision === 'approved').length,
    approvedWithAlgorithm: decisions.filter(
      (decision) => decision.decision === 'approved' && decision.selectionSource === 'algorithm',
    ).length,
    manuallyCorrected: decisions.filter(
      (decision) =>
        decision.decision === 'approved' && decision.selectionSource === 'editorial-manual',
    ).length,
    rejected: decisions.filter((decision) => decision.decision === 'rejected').length,
    manual: decisions.filter((decision) => decision.decision === 'manual').length,
  };
}

function parseImportedDecisionRecords(imported: unknown): EditorialReviewDecisionRecord[] {
  if (Array.isArray(imported)) {
    return imported.filter(isEditorialReviewDecisionRecord);
  }

  if (
    typeof imported === 'object' &&
    imported !== null &&
    'decisions' in imported &&
    Array.isArray(imported.decisions)
  ) {
    return imported.decisions.filter(isEditorialReviewDecisionRecord);
  }

  return [];
}

function isEditorialReviewDecisionRecord(value: unknown): value is EditorialReviewDecisionRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Partial<EditorialReviewDecisionRecord>;

  return (
    typeof record.candidateKey === 'string' &&
    (record.decision === 'approved' ||
      record.decision === 'rejected' ||
      record.decision === 'manual')
  );
}
