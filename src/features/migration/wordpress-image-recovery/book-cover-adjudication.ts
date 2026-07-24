import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseCsv } from './csv';

export const BOOK_COVER_ADJUDICATION_THRESHOLDS = {
  positiveCoverScore: 75,
  negativeAuthorScore: 45,
  minimumWinnerGap: 25,
};

type BookCoverDecision = 'safe_book_cover' | 'ambiguous' | 'no_safe_candidate';

interface DiagnosisItem {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  candidates: DiagnosisCandidate[];
}

interface DiagnosisCandidate {
  origin: string;
  attachmentId: string | null;
  url: string | null;
  filename: string | null;
  width: number | null;
  height: number | null;
  ratio: number | null;
  titleMatch: boolean;
  slugMatch: boolean;
  isbnMatch: boolean;
  hasAuthorPhotoSignal: boolean;
  explanation: string[];
}

interface RecoveryPlanFile {
  items: RecoveryPlanItem[];
}

interface RecoveryPlanItem {
  entityType: 'author' | 'book';
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  category: string;
  candidate?: {
    attachmentId: string | null;
    url: string | null;
    filename: string | null;
  } | null;
}

interface PlannedImage {
  candidateKey: string;
  entityType: 'author' | 'book';
  sourceWpPostId: string;
  attachmentId: string | null;
  filename: string | null;
  url: string | null;
  status: string;
  action: string;
  confidence: string;
  reasons: string[];
}

interface ManifestFile {
  entries: ManifestEntry[];
}

interface ManifestEntry {
  candidateKey: string;
  entityType: string;
  sourceWpPostId: string;
  targetId: string | null;
  status: string;
  checkpoint: string;
  sourceMetadata?: {
    publicUrl?: string;
    path?: string;
  };
}

interface BookAuditRow {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  sourceAuthorTitle: string;
  sourceAuthorSlug: string;
}

interface ImageIdentity {
  attachmentId: string | null;
  normalizedUrl: string | null;
  normalizedFilename: string | null;
  baseFilename: string | null;
}

export interface BookCoverAdjudicationCandidate {
  groupKey: string;
  origins: string[];
  attachmentIds: string[];
  urls: string[];
  filenames: string[];
  width: number | null;
  height: number | null;
  ratio: number | null;
  positiveCoverScore: number;
  negativeAuthorScore: number;
  finalScore: number;
  positiveSignals: string[];
  negativeSignals: string[];
  discardReasons: string[];
  isEquivalentToAuthorPhoto: boolean;
  isWinner: boolean;
  gapToNextCandidate: number | null;
}

export interface BookCoverAdjudicationItem {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  author: string;
  decision: BookCoverDecision;
  winnerGroupKey: string | null;
  winnerGap: number | null;
  hasAuthorPhotoConflict: boolean;
  hasCoverKeyword: boolean;
  hasTitleMatch: boolean;
  decisionReasons: string[];
  candidates: BookCoverAdjudicationCandidate[];
}

export interface BookCoverAdjudicationStatistics {
  generatedAt: string;
  totalBooksAdjudicated: number;
  safeBookCover: number;
  ambiguous: number;
  noSafeCandidate: number;
  rejectedByAuthorPhotoConflict: number;
  scoreDistribution: Record<string, number>;
  winnerGapDistribution: Record<string, number>;
  thresholdSimulation: Array<{
    positiveCoverScore: number;
    negativeAuthorScore: number;
    minimumWinnerGap: number;
    safeBookCover: number;
  }>;
  changedByThreshold: Array<{
    candidateKey: string;
    title: string;
    currentDecision: BookCoverDecision;
    alternativeDecision: BookCoverDecision;
    thresholdLabel: string;
  }>;
  thresholds: typeof BOOK_COVER_ADJUDICATION_THRESHOLDS;
}

export interface BookCoverAdjudication {
  generatedAt: string;
  items: BookCoverAdjudicationItem[];
  statistics: BookCoverAdjudicationStatistics;
}

interface AuthorPhotoIndex {
  allIdentities: ImageIdentity[];
  safeIdentities: ImageIdentity[];
  identitiesBySourceWpPostId: Map<string, ImageIdentity[]>;
}

export async function adjudicateBookCovers(params: {
  massDirectory: string;
  auditDirectory: string;
}): Promise<BookCoverAdjudication> {
  const massDirectory = path.resolve(params.massDirectory);
  const auditDirectory = path.resolve(params.auditDirectory);
  const imageRecoveryDirectory = path.join(massDirectory, 'image-recovery');
  const [diagnosis, recoveryPlan, authorImages, bookCovers, manifest, books] = await Promise.all([
    readJson<DiagnosisItem[]>(path.join(imageRecoveryDirectory, 'book-cover-diagnosis.json')),
    readJson<RecoveryPlanFile>(path.join(imageRecoveryDirectory, 'recovery-plan.json')),
    readJson<PlannedImage[]>(path.join(massDirectory, 'apply', 'author-images.json')),
    readJson<PlannedImage[]>(path.join(massDirectory, 'apply', 'book-covers.json')),
    readJson<ManifestFile>(path.join(massDirectory, 'apply', 'manifest.json')),
    readCsv<BookAuditRow>(path.join(auditDirectory, 'books-candidates.csv')),
  ]);
  const authorPhotoIndex = createAuthorPhotoIndex({ recoveryPlan, authorImages, manifest });
  const bookCoverPlanByKey = new Map(bookCovers.map((cover) => [cover.candidateKey, cover]));
  const booksByKey = new Map(books.map((book) => [book.candidateKey, book]));
  const items = diagnosis
    .map((item) =>
      adjudicateBook({
        item,
        authorPhotoIndex,
        plannedBookCover: bookCoverPlanByKey.get(item.candidateKey),
        book: booksByKey.get(item.candidateKey),
      }),
    )
    .sort((left, right) => left.title.localeCompare(right.title));
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    items,
    statistics: createStatistics(generatedAt, items),
  };
}

function adjudicateBook(params: {
  item: DiagnosisItem;
  authorPhotoIndex: AuthorPhotoIndex;
  plannedBookCover: PlannedImage | undefined;
  book: BookAuditRow | undefined;
}): BookCoverAdjudicationItem {
  const { item, authorPhotoIndex, plannedBookCover, book } = params;
  const authorName = book?.sourceAuthorTitle ?? '';
  const groups = groupEquivalentCandidates(item.candidates)
    .map((group) =>
      scoreCandidateGroup({
        item,
        group,
        authorName,
        authorPhotoIndex,
        plannedBookCover,
      }),
    )
    .sort(compareAdjudicationCandidates);
  const [winner, runnerUp] = groups;
  const winnerGap = winner ? winner.finalScore - (runnerUp?.finalScore ?? 0) : null;
  const hasSevereContradiction = Boolean(
    winner?.isEquivalentToAuthorPhoto ||
    winner?.negativeSignals.includes('author_photo_signal_from_previous_metadata') ||
    winner?.negativeSignals.includes('filename_matches_author_name'),
  );
  const safe =
    Boolean(winner) &&
    winner.positiveCoverScore >= BOOK_COVER_ADJUDICATION_THRESHOLDS.positiveCoverScore &&
    winner.negativeAuthorScore < BOOK_COVER_ADJUDICATION_THRESHOLDS.negativeAuthorScore &&
    (winnerGap ?? 0) >= BOOK_COVER_ADJUDICATION_THRESHOLDS.minimumWinnerGap &&
    !hasSevereContradiction &&
    !hasEquivalentScoreTie(winner, groups);
  const decision = safe ? 'safe_book_cover' : groups.length > 0 ? 'ambiguous' : 'no_safe_candidate';
  const candidates = groups.map((candidate) => ({
    ...candidate,
    isWinner: candidate.groupKey === winner?.groupKey,
    gapToNextCandidate: candidate.groupKey === winner?.groupKey ? winnerGap : null,
    discardReasons:
      candidate.groupKey === winner?.groupKey
        ? discardReasonsForWinner(candidate, winnerGap, hasSevereContradiction)
        : ['No es la candidata con mayor finalScore.'],
  }));

  return {
    candidateKey: item.candidateKey,
    sourceWpPostId: item.sourceWpPostId,
    title: item.title,
    author: authorName,
    decision,
    winnerGroupKey: safe ? (winner?.groupKey ?? null) : null,
    winnerGap,
    hasAuthorPhotoConflict: candidates.some((candidate) => candidate.isEquivalentToAuthorPhoto),
    hasCoverKeyword: candidates.some((candidate) =>
      candidate.positiveSignals.includes('filename_has_cover_keyword'),
    ),
    hasTitleMatch: candidates.some((candidate) =>
      candidate.positiveSignals.includes('filename_or_metadata_matches_title'),
    ),
    decisionReasons: decisionReasonsForBook(decision, winner, winnerGap, hasSevereContradiction),
    candidates,
  };
}

interface CandidateGroup {
  groupKey: string;
  candidates: DiagnosisCandidate[];
  identity: ImageIdentity;
}

function groupEquivalentCandidates(candidates: DiagnosisCandidate[]): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>();

  for (const candidate of candidates) {
    const identity = createIdentity(candidate);
    const groupKey = createGroupKey(identity);
    const group = groups.get(groupKey);

    if (group) {
      group.candidates.push(candidate);
      continue;
    }

    groups.set(groupKey, {
      groupKey,
      candidates: [candidate],
      identity,
    });
  }

  return [...groups.values()].sort((left, right) => left.groupKey.localeCompare(right.groupKey));
}

function scoreCandidateGroup(params: {
  item: DiagnosisItem;
  group: CandidateGroup;
  authorName: string;
  authorPhotoIndex: AuthorPhotoIndex;
  plannedBookCover: PlannedImage | undefined;
}): BookCoverAdjudicationCandidate {
  const representative = params.group.candidates[0];
  const filenames = unique(
    params.group.candidates.map((candidate) => candidate.filename).filter(isString),
  );
  const urls = unique(params.group.candidates.map((candidate) => candidate.url).filter(isString));
  const origins = unique(params.group.candidates.map((candidate) => candidate.origin));
  const attachmentIds = unique(
    params.group.candidates.map((candidate) => candidate.attachmentId).filter(isString),
  );
  const text = normalizeText(
    [
      ...filenames,
      ...origins,
      ...params.group.candidates.flatMap((candidate) => candidate.explanation),
    ].join(' '),
  );
  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];
  const hasCoverKeyword = /portada|cover|cubierta|tapa|libro|book/u.test(text);
  const hasAuthorKeyword = /autor|author|foto|photo|retrato|perfil|headshot/u.test(text);
  const titleWords = significantWords(params.item.title);
  const authorWords = significantWords(params.authorName);
  const titleMatches =
    params.group.candidates.some((candidate) => candidate.titleMatch) ||
    (titleWords.length > 0 && titleWords.every((word) => text.includes(word)));
  const partialTitleMatches = titleWords.filter((word) => text.includes(word)).length;
  const authorNameMatches = authorWords.some((word) => text.includes(word));
  const ratio =
    representative?.ratio ?? calculateRatio(representative?.width, representative?.height);
  const coverRatio = ratio !== null && ratio >= 0.55 && ratio <= 0.8;
  const portraitPhotoRatio = ratio !== null && ratio >= 0.72 && ratio <= 1.35;
  const hasCoverDimensions = Boolean(
    representative?.width &&
    representative.height &&
    representative.width >= 450 &&
    representative.height >= 650 &&
    representative.height > representative.width,
  );
  const equivalentToAuthorPhoto = imageMatchesAuthorPhoto(
    params.group.identity,
    params.authorPhotoIndex,
    params.item.sourceWpPostId,
  );
  let positiveCoverScore = 0;
  let negativeAuthorScore = 0;

  if (hasCoverKeyword) {
    positiveCoverScore += 30;
    positiveSignals.push('filename_has_cover_keyword');
  }

  if (titleMatches) {
    positiveCoverScore += 35;
    positiveSignals.push('filename_or_metadata_matches_title');
  } else if (partialTitleMatches > 0) {
    positiveCoverScore += Math.min(20, partialTitleMatches * 8);
    positiveSignals.push('partial_significant_title_word_match');
  }

  if (coverRatio) {
    positiveCoverScore += 20;
    positiveSignals.push('typical_vertical_cover_ratio');
  }

  if (origins.includes('imagen_destacada_2')) {
    positiveCoverScore += 20;
    positiveSignals.push('origin_imagen_destacada_2');
  }

  if (origins.includes('dfiFeatured')) {
    positiveCoverScore += 12;
    positiveSignals.push('origin_dfiFeatured');
  }

  if (hasCoverDimensions) {
    positiveCoverScore += 15;
    positiveSignals.push('cover_sized_dimensions');
  }

  if (!equivalentToAuthorPhoto) {
    positiveCoverScore += 10;
    positiveSignals.push('candidate_differs_from_author_photo');
  }

  if (hasAuthorKeyword) {
    negativeAuthorScore += 30;
    negativeSignals.push('filename_has_author_photo_keyword');
  }

  if (authorNameMatches) {
    negativeAuthorScore += 35;
    negativeSignals.push('filename_matches_author_name');
  }

  if (equivalentToAuthorPhoto) {
    negativeAuthorScore += 80;
    negativeSignals.push('candidate_matches_author_photo');
  }

  if (imageMatchesSafeAuthorPhoto(params.group.identity, params.authorPhotoIndex)) {
    negativeAuthorScore += 45;
    negativeSignals.push('candidate_appears_as_safe_author_photo');
  }

  if (params.group.candidates.some((candidate) => candidate.hasAuthorPhotoSignal)) {
    negativeAuthorScore += 35;
    negativeSignals.push('author_photo_signal_from_previous_metadata');
  }

  if (portraitPhotoRatio && !hasCoverKeyword) {
    negativeAuthorScore += 15;
    negativeSignals.push('portrait_photo_ratio_without_cover_keyword');
  }

  if (
    params.plannedBookCover &&
    imageMatchesPlannedBookCover(params.group.identity, params.plannedBookCover)
  ) {
    positiveCoverScore += 20;
    positiveSignals.push('matches_previous_book_cover_candidate');
  }

  const finalScore = positiveCoverScore - negativeAuthorScore;

  return {
    groupKey: params.group.groupKey,
    origins,
    attachmentIds,
    urls,
    filenames,
    width: representative?.width ?? null,
    height: representative?.height ?? null,
    ratio,
    positiveCoverScore,
    negativeAuthorScore,
    finalScore,
    positiveSignals,
    negativeSignals,
    discardReasons: [],
    isEquivalentToAuthorPhoto: equivalentToAuthorPhoto,
    isWinner: false,
    gapToNextCandidate: null,
  };
}

function createAuthorPhotoIndex(params: {
  recoveryPlan: RecoveryPlanFile;
  authorImages: PlannedImage[];
  manifest: ManifestFile;
}): AuthorPhotoIndex {
  const appliedAuthorKeys = new Set(
    params.manifest.entries
      .filter((entry) => entry.entityType === 'author_image' && entry.status === 'applied')
      .map((entry) => entry.candidateKey),
  );
  const allIdentities: ImageIdentity[] = [];
  const safeIdentities: ImageIdentity[] = [];
  const identitiesBySourceWpPostId = new Map<string, ImageIdentity[]>();

  for (const image of params.authorImages) {
    const identity = createIdentity(image);
    allIdentities.push(identity);

    if (
      image.confidence === 'high' ||
      image.status === 'READY' ||
      appliedAuthorKeys.has(image.candidateKey)
    ) {
      safeIdentities.push(identity);
    }

    const identities = identitiesBySourceWpPostId.get(image.sourceWpPostId) ?? [];
    identities.push(identity);
    identitiesBySourceWpPostId.set(image.sourceWpPostId, identities);
  }

  for (const item of params.recoveryPlan.items) {
    if (item.entityType !== 'author' || item.category !== 'safe_author_photo' || !item.candidate) {
      continue;
    }

    const identity = createIdentity(item.candidate);
    allIdentities.push(identity);
    safeIdentities.push(identity);
  }

  return { allIdentities, safeIdentities, identitiesBySourceWpPostId };
}

function imageMatchesAuthorPhoto(
  identity: ImageIdentity,
  index: AuthorPhotoIndex,
  sourceWpPostId: string,
) {
  const sameSourceImages = index.identitiesBySourceWpPostId.get(sourceWpPostId) ?? [];

  return sameSourceImages.some((candidate) => equivalentIdentity(identity, candidate));
}

function imageMatchesSafeAuthorPhoto(identity: ImageIdentity, index: AuthorPhotoIndex) {
  return index.safeIdentities.some((candidate) => equivalentIdentity(identity, candidate));
}

function imageMatchesPlannedBookCover(identity: ImageIdentity, plannedBookCover: PlannedImage) {
  return equivalentIdentity(identity, createIdentity(plannedBookCover));
}

function createIdentity(value: {
  attachmentId?: string | null;
  url?: string | null;
  filename?: string | null;
}): ImageIdentity {
  const normalizedUrl = normalizeUrl(value.url ?? null);
  const normalizedFilename = normalizeFilename(value.filename ?? filenameFromUrl(value.url));

  return {
    attachmentId: value.attachmentId ?? null,
    normalizedUrl,
    normalizedFilename,
    baseFilename: baseImageFilename(normalizedFilename),
  };
}

function createGroupKey(identity: ImageIdentity) {
  return (
    (identity.attachmentId ? `attachment:${identity.attachmentId}` : null) ??
    (identity.baseFilename ? `file:${identity.baseFilename}` : null) ??
    (identity.normalizedUrl ? `url:${identity.normalizedUrl}` : 'unknown')
  );
}

export function equivalentIdentity(left: ImageIdentity, right: ImageIdentity) {
  return Boolean(
    (left.attachmentId && right.attachmentId && left.attachmentId === right.attachmentId) ||
    (left.normalizedUrl && right.normalizedUrl && left.normalizedUrl === right.normalizedUrl) ||
    (left.baseFilename && right.baseFilename && left.baseFilename === right.baseFilename),
  );
}

export function normalizeUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(decodeURI(value));
    url.protocol = 'https:';
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/u, '').toLowerCase();
  } catch {
    return decodeURI(value).split('?')[0]?.toLowerCase() ?? value.toLowerCase();
  }
}

export function normalizeFilename(value: string | null) {
  if (!value) {
    return null;
  }

  return (
    decodeURIComponent(value)
      .split('?')[0]
      ?.split('/')
      .filter(Boolean)
      .at(-1)
      ?.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/gu, '-')
      .replace(/[^a-z0-9._-]+/gu, '-') ?? null
  );
}

export function baseImageFilename(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .replace(/-\d{2,5}x\d{2,5}(?=\.[a-z0-9]+$)/iu, '')
    .replace(/-scaled(?=\.[a-z0-9]+$)/iu, '')
    .replace(/\.[a-z0-9]+$/iu, '');
}

function compareAdjudicationCandidates(
  left: BookCoverAdjudicationCandidate,
  right: BookCoverAdjudicationCandidate,
) {
  return (
    right.finalScore - left.finalScore ||
    right.positiveCoverScore - left.positiveCoverScore ||
    left.negativeAuthorScore - right.negativeAuthorScore ||
    left.groupKey.localeCompare(right.groupKey)
  );
}

function hasEquivalentScoreTie(
  winner: BookCoverAdjudicationCandidate,
  candidates: BookCoverAdjudicationCandidate[],
) {
  return candidates.some(
    (candidate) =>
      candidate.groupKey !== winner.groupKey && candidate.finalScore === winner.finalScore,
  );
}

function discardReasonsForWinner(
  winner: BookCoverAdjudicationCandidate,
  winnerGap: number | null,
  hasSevereContradiction: boolean,
) {
  return [
    ...(winner.positiveCoverScore < BOOK_COVER_ADJUDICATION_THRESHOLDS.positiveCoverScore
      ? ['positiveCoverScore insuficiente.']
      : []),
    ...(winner.negativeAuthorScore >= BOOK_COVER_ADJUDICATION_THRESHOLDS.negativeAuthorScore
      ? ['negativeAuthorScore demasiado alto.']
      : []),
    ...((winnerGap ?? 0) < BOOK_COVER_ADJUDICATION_THRESHOLDS.minimumWinnerGap
      ? ['Diferencia frente a la segunda candidata insuficiente.']
      : []),
    ...(hasSevereContradiction ? ['Existen senales contradictorias graves de foto de autor.'] : []),
  ];
}

function decisionReasonsForBook(
  decision: BookCoverDecision,
  winner: BookCoverAdjudicationCandidate | undefined,
  winnerGap: number | null,
  hasSevereContradiction: boolean,
) {
  if (!winner) {
    return ['No hay candidatas de imagen.'];
  }

  if (decision === 'safe_book_cover') {
    return [
      `positiveCoverScore ${winner.positiveCoverScore} >= ${BOOK_COVER_ADJUDICATION_THRESHOLDS.positiveCoverScore}`,
      `negativeAuthorScore ${winner.negativeAuthorScore} < ${BOOK_COVER_ADJUDICATION_THRESHOLDS.negativeAuthorScore}`,
      `winnerGap ${winnerGap ?? 0} >= ${BOOK_COVER_ADJUDICATION_THRESHOLDS.minimumWinnerGap}`,
    ];
  }

  return [
    ...discardReasonsForWinner(winner, winnerGap, hasSevereContradiction),
    ...(discardReasonsForWinner(winner, winnerGap, hasSevereContradiction).length === 0
      ? ['Requiere revision manual por empate o senales insuficientes.']
      : []),
  ];
}

function createStatistics(
  generatedAt: string,
  items: BookCoverAdjudicationItem[],
): BookCoverAdjudicationStatistics {
  const scoreDistribution = bucketScores(
    items.flatMap((item) => item.candidates.map((candidate) => candidate.finalScore)),
  );
  const winnerGapDistribution = bucketScores(
    items.map((item) => item.winnerGap).filter((value): value is number => value !== null),
  );
  const thresholdSimulation = [
    simulateThreshold(items, 65, 45, 20),
    simulateThreshold(items, 75, 45, 25),
    simulateThreshold(items, 85, 35, 30),
  ];

  return {
    generatedAt,
    totalBooksAdjudicated: items.length,
    safeBookCover: items.filter((item) => item.decision === 'safe_book_cover').length,
    ambiguous: items.filter((item) => item.decision === 'ambiguous').length,
    noSafeCandidate: items.filter((item) => item.decision === 'no_safe_candidate').length,
    rejectedByAuthorPhotoConflict: items.filter((item) => item.hasAuthorPhotoConflict).length,
    scoreDistribution,
    winnerGapDistribution,
    thresholdSimulation,
    changedByThreshold: createChangedByThreshold(items, thresholdSimulation),
    thresholds: BOOK_COVER_ADJUDICATION_THRESHOLDS,
  };
}

function simulateThreshold(
  items: BookCoverAdjudicationItem[],
  positiveCoverScore: number,
  negativeAuthorScore: number,
  minimumWinnerGap: number,
) {
  return {
    positiveCoverScore,
    negativeAuthorScore,
    minimumWinnerGap,
    safeBookCover: items.filter((item) => {
      const winner = item.candidates[0];

      return Boolean(
        winner &&
        winner.positiveCoverScore >= positiveCoverScore &&
        winner.negativeAuthorScore < negativeAuthorScore &&
        (item.winnerGap ?? 0) >= minimumWinnerGap &&
        !winner.isEquivalentToAuthorPhoto,
      );
    }).length,
  };
}

function createChangedByThreshold(
  items: BookCoverAdjudicationItem[],
  simulations: Array<{
    positiveCoverScore: number;
    negativeAuthorScore: number;
    minimumWinnerGap: number;
    safeBookCover: number;
  }>,
) {
  return simulations.flatMap((simulation) => {
    const thresholdLabel = `${simulation.positiveCoverScore}/${simulation.negativeAuthorScore}/${simulation.minimumWinnerGap}`;

    return items
      .filter((item) => {
        const alternativeDecision = decisionWithThreshold(item, simulation);

        return alternativeDecision !== item.decision;
      })
      .map((item) => {
        const alternativeDecision = decisionWithThreshold(item, simulation);

        return {
          candidateKey: item.candidateKey,
          title: item.title,
          currentDecision: item.decision,
          alternativeDecision,
          thresholdLabel,
        };
      });
  });
}

function decisionWithThreshold(
  item: BookCoverAdjudicationItem,
  simulation: {
    positiveCoverScore: number;
    negativeAuthorScore: number;
    minimumWinnerGap: number;
  },
): BookCoverDecision {
  const winner = item.candidates[0];

  if (
    winner &&
    winner.positiveCoverScore >= simulation.positiveCoverScore &&
    winner.negativeAuthorScore < simulation.negativeAuthorScore &&
    (item.winnerGap ?? 0) >= simulation.minimumWinnerGap &&
    !winner.isEquivalentToAuthorPhoto
  ) {
    return 'safe_book_cover';
  }

  return item.candidates.length > 0 ? 'ambiguous' : 'no_safe_candidate';
}

function bucketScores(scores: number[]) {
  const buckets = {
    '<0': 0,
    '0-24': 0,
    '25-49': 0,
    '50-74': 0,
    '75-99': 0,
    '100+': 0,
  };

  for (const score of scores) {
    if (score < 0) {
      buckets['<0'] += 1;
    } else if (score < 25) {
      buckets['0-24'] += 1;
    } else if (score < 50) {
      buckets['25-49'] += 1;
    } else if (score < 75) {
      buckets['50-74'] += 1;
    } else if (score < 100) {
      buckets['75-99'] += 1;
    } else {
      buckets['100+'] += 1;
    }
  }

  return buckets;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readCsv<T>(filePath: string): Promise<T[]> {
  return parseCsv(await readFile(filePath, 'utf8')) as T[];
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function significantWords(value: string) {
  const stopWords = new Set(['del', 'las', 'los', 'una', 'uno', 'con', 'para', 'por', 'que']);

  return normalizeText(value)
    .split(' ')
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function calculateRatio(width: number | null | undefined, height: number | null | undefined) {
  if (!width || !height) {
    return null;
  }

  return Math.round((width / height) * 1000) / 1000;
}

function filenameFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.split('?')[0]?.split('/').filter(Boolean).at(-1) ?? null;
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isString(value: string | null): value is string {
  return Boolean(value);
}
