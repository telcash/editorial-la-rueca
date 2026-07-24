import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseWxr } from '@/features/migration/wordpress-audit/parser';
import type { WordPressItem } from '@/features/migration/wordpress-audit/types';
import { parseCsv } from './csv';
import type {
  ImageRecoveryInputPaths,
  ImageRecoveryMode,
  ImageRecoveryPlan,
  RecoveryImageCandidate,
  RecoveryPlanItem,
  TechnicalImageErrorCode,
} from './types';

const technicalErrorCodes: TechnicalImageErrorCode[] = [
  'IMAGE_TOO_LARGE',
  'DOWNLOAD_FAILED',
  'INVALID_MIME',
  'UPLOAD_FAILED',
];

interface ManifestEntry {
  candidateKey: string;
  entityType: 'author_image' | 'book_cover' | string;
  sourceWpPostId: string;
  targetId: string | null;
  status: string;
  checkpoint: string;
  sourceMetadata: Record<string, string | boolean | null>;
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

interface AttachmentRow {
  wpPostId: string;
  title: string;
  slug: string;
  url: string;
  parentId: string;
  mimeType: string;
  width: string;
  height: string;
  attachedFile: string;
}

interface EntityRow {
  candidateKey: string;
  sourceWpPostId: string;
  name?: string;
  title?: string;
  thumbnailId?: string;
  imageFieldId?: string;
}

interface BookCoverBestMatch {
  bookCandidateKey: string;
  bookTitle: string;
  bestCandidate: BookCoverCandidate | null;
  confidence?: string;
  alternatives: BookCoverCandidate[];
}

interface BookCoverCandidate {
  attachmentId: string;
  attachmentUrl: string;
  filename: string;
  attachmentTitle: string;
  width: number;
  height: number;
  confidence: string;
  score: number;
  reasons: string;
}

interface RecoveryData {
  manifestEntries: ManifestEntry[];
  plannedImages: PlannedImage[];
  attachmentsById: Map<string, AttachmentRow>;
  authorsByKey: Map<string, EntityRow>;
  booksByKey: Map<string, EntityRow>;
  bookCoverMatchesByKey: Map<string, BookCoverBestMatch>;
  wxrItemsByPostId: Map<string, WordPressItem>;
}

export async function analyzeImageRecovery(params: {
  paths: ImageRecoveryInputPaths;
  mode: ImageRecoveryMode;
  batchSize: number;
}): Promise<ImageRecoveryPlan> {
  const data = await readRecoveryData(params.paths);
  const generatedAt = new Date().toISOString();
  const items = data.manifestEntries
    .filter((entry) => entry.entityType === 'author_image' || entry.entityType === 'book_cover')
    .map((entry) => createRecoveryItem(entry, data))
    .filter((item) => !item.alreadyApplied);
  const result = createResult(generatedAt, params.mode, items, data.manifestEntries);

  return {
    generatedAt,
    mode: params.mode,
    xmlSource: params.paths.xmlInputPath ?? null,
    batchSize: params.batchSize,
    items,
    result,
    manifest: {
      generatedAt,
      mode: params.mode,
      batchSize: params.batchSize,
      entries: items.map((item) => ({
        candidateKey: item.candidateKey,
        entityType: item.entityType,
        sourceWpPostId: item.sourceWpPostId,
        targetId: item.targetId,
        status: item.decision === 'skip' ? 'skipped' : 'planned',
        category: item.category,
        decision: item.decision,
        candidateUrl: item.candidate?.url ?? null,
      })),
    },
  };
}

async function readRecoveryData(paths: ImageRecoveryInputPaths): Promise<RecoveryData> {
  const [
    manifest,
    authorImages,
    bookCovers,
    attachments,
    authors,
    books,
    bookCoverMatches,
    wxrItemsByPostId,
  ] = await Promise.all([
    readJson<{ entries: ManifestEntry[] }>(path.join(paths.massApplyDirectory, 'manifest.json')),
    readJson<PlannedImage[]>(path.join(paths.massApplyDirectory, 'author-images.json')),
    readJson<PlannedImage[]>(path.join(paths.massApplyDirectory, 'book-covers.json')),
    readCsv<AttachmentRow>(path.join(paths.auditDirectory, 'attachments-candidates.csv')),
    readCsv<EntityRow>(path.join(paths.auditDirectory, 'authors-candidates.csv')),
    readCsv<EntityRow>(path.join(paths.auditDirectory, 'books-candidates.csv')),
    readOptionalJson<BookCoverBestMatch[]>(
      path.join(paths.auditDirectory, 'book-cover-best-match.json'),
      [],
    ),
    readWxrItems(paths.xmlInputPath),
  ]);

  return {
    manifestEntries: manifest.entries,
    plannedImages: [...authorImages, ...bookCovers],
    attachmentsById: new Map(attachments.map((attachment) => [attachment.wpPostId, attachment])),
    authorsByKey: new Map(authors.map((author) => [author.candidateKey, author])),
    booksByKey: new Map(books.map((book) => [book.candidateKey, book])),
    bookCoverMatchesByKey: new Map(
      bookCoverMatches.map((match) => [match.bookCandidateKey, match]),
    ),
    wxrItemsByPostId,
  };
}

function createRecoveryItem(entry: ManifestEntry, data: RecoveryData): RecoveryPlanItem {
  const entityType = entry.entityType === 'author_image' ? 'author' : 'book';
  const plannedImage = data.plannedImages.find(
    (image) => image.candidateKey === entry.candidateKey && image.entityType === entityType,
  );
  const entity =
    entityType === 'author'
      ? data.authorsByKey.get(entry.candidateKey)
      : data.booksByKey.get(entry.candidateKey);
  const title = entity?.name ?? entity?.title ?? entry.candidateKey;
  const migrationErrorCode = getTechnicalErrorCode(entry, plannedImage);

  if (entry.status === 'applied') {
    return createSkippedItem(entry, entityType, title, plannedImage, migrationErrorCode, true);
  }

  if (migrationErrorCode && plannedImage?.url) {
    const candidate = createCandidateFromPlan(plannedImage, data, 'mass_apply_retry');

    return {
      entityType,
      candidateKey: entry.candidateKey,
      sourceWpPostId: entry.sourceWpPostId,
      targetId: entry.targetId,
      title,
      category: 'technical_retry',
      decision:
        migrationErrorCode === 'IMAGE_TOO_LARGE'
          ? 'retry_with_transform'
          : imageDecision(entityType),
      confidence: plannedImage.confidence === 'high' ? 'high' : 'medium',
      migrationErrorCode,
      candidate,
      transform: createTransformPlan(entityType, migrationErrorCode),
      reasons: [
        `Error tecnico recuperable: ${migrationErrorCode}`,
        ...(plannedImage.reasons ?? []),
      ],
      alreadyApplied: false,
    };
  }

  if (entityType === 'author') {
    return classifyAuthorPhoto(entry, title, plannedImage, data);
  }

  return classifyBookCover(entry, title, plannedImage, data);
}

function classifyAuthorPhoto(
  entry: ManifestEntry,
  title: string,
  plannedImage: PlannedImage | undefined,
  data: RecoveryData,
): RecoveryPlanItem {
  const candidate = plannedImage
    ? createCandidateFromPlan(plannedImage, data, '_thumbnail_id')
    : null;
  const signals = candidate ? scoreAuthorPhotoSignals(candidate, title) : [];
  const hasStrongAuthorSignals = signals.includes('filename_matches_author_or_photo');
  const hasCoverSignals =
    candidate?.signals.some((signal) => signal.includes('cover_signal')) ?? false;
  const hasUsableCandidate = Boolean(candidate?.url);
  const category =
    hasUsableCandidate && hasStrongAuthorSignals && !hasCoverSignals
      ? 'safe_author_photo'
      : hasUsableCandidate
        ? 'ambiguous'
        : 'no_candidate';

  return {
    entityType: 'author',
    candidateKey: entry.candidateKey,
    sourceWpPostId: entry.sourceWpPostId,
    targetId: entry.targetId,
    title,
    category,
    decision:
      category === 'safe_author_photo'
        ? 'upload_author_photo'
        : category === 'ambiguous'
          ? 'manual_review'
          : 'skip',
    confidence:
      category === 'safe_author_photo' ? 'high' : category === 'ambiguous' ? 'low' : 'none',
    migrationErrorCode: null,
    candidate: candidate ? { ...candidate, signals: [...candidate.signals, ...signals] } : null,
    transform: createTransformPlan('author', null),
    reasons:
      category === 'safe_author_photo'
        ? ['_thumbnail_id con señales fuertes de foto de autor.']
        : category === 'ambiguous'
          ? ['Existe candidato, pero no hay señales suficientes para asignación automática.']
          : ['No existe candidato de imagen utilizable.'],
    alreadyApplied: false,
  };
}

function classifyBookCover(
  entry: ManifestEntry,
  title: string,
  plannedImage: PlannedImage | undefined,
  data: RecoveryData,
): RecoveryPlanItem {
  const match = data.bookCoverMatchesByKey.get(entry.candidateKey);
  const wxrCandidates = extractBookCandidatesFromWxr(entry, data);
  const plannedCandidate = plannedImage?.url
    ? createCandidateFromPlan(plannedImage, data, 'mass_book_cover_plan')
    : null;
  const bestCandidate = createCandidateFromBookMatch(match?.bestCandidate, 'book_cover_best_match');
  const candidate = plannedCandidate ?? bestCandidate ?? wxrCandidates[0] ?? null;
  const hasAuthorPhotoSignal =
    candidate?.signals.some((signal) => signal === 'strong_author_photo_signal') ?? false;
  const hasSafeCoverSignal =
    candidate?.signals.some((signal) => signal === 'filename_or_title_matches_book') ??
    match?.confidence === 'high';
  const category =
    candidate && hasSafeCoverSignal && !hasAuthorPhotoSignal
      ? 'safe_book_cover'
      : candidate
        ? 'ambiguous'
        : 'no_candidate';

  return {
    entityType: 'book',
    candidateKey: entry.candidateKey,
    sourceWpPostId: entry.sourceWpPostId,
    targetId: entry.targetId,
    title,
    category,
    decision:
      category === 'safe_book_cover'
        ? 'upload_book_cover'
        : category === 'ambiguous'
          ? 'manual_review'
          : 'skip',
    confidence: category === 'safe_book_cover' ? 'high' : category === 'ambiguous' ? 'low' : 'none',
    migrationErrorCode: null,
    candidate,
    transform: createTransformPlan('book', null),
    reasons:
      category === 'safe_book_cover'
        ? ['Candidato con señales fuertes de portada y sin señales fuertes de foto de autor.']
        : category === 'ambiguous'
          ? ['Candidato requiere revisión manual antes de asignarlo como portada.']
          : ['No existe candidato de portada utilizable.'],
    alreadyApplied: false,
  };
}

function createSkippedItem(
  entry: ManifestEntry,
  entityType: 'author' | 'book',
  title: string,
  plannedImage: PlannedImage | undefined,
  migrationErrorCode: TechnicalImageErrorCode | null,
  alreadyApplied: boolean,
): RecoveryPlanItem {
  return {
    entityType,
    candidateKey: entry.candidateKey,
    sourceWpPostId: entry.sourceWpPostId,
    targetId: entry.targetId,
    title,
    category: 'no_candidate',
    decision: 'skip',
    confidence: 'none',
    migrationErrorCode,
    candidate: plannedImage
      ? {
          attachmentId: plannedImage.attachmentId,
          url: plannedImage.url,
          filename: plannedImage.filename,
          title: plannedImage.filename,
          origin: 'already_applied',
          width: null,
          height: null,
          mimeType: detectMimeType(plannedImage.filename, plannedImage.url),
          signals: ['already_applied'],
        }
      : null,
    transform: createTransformPlan(entityType, null),
    reasons: ['La imagen ya consta como aplicada en manifest; no se sobrescribe.'],
    alreadyApplied,
  };
}

function getTechnicalErrorCode(
  entry: ManifestEntry,
  plannedImage: PlannedImage | undefined,
): TechnicalImageErrorCode | null {
  const explicitCode = entry.sourceMetadata.migrationErrorCode;

  if (typeof explicitCode === 'string' && isTechnicalErrorCode(explicitCode)) {
    return explicitCode;
  }

  if ((entry.status === 'partial' || entry.status === 'failed') && plannedImage?.url) {
    return 'DOWNLOAD_FAILED';
  }

  return null;
}

function isTechnicalErrorCode(value: string): value is TechnicalImageErrorCode {
  return technicalErrorCodes.some((code) => code === value);
}

function createCandidateFromPlan(
  image: PlannedImage,
  data: RecoveryData,
  origin: string,
): RecoveryImageCandidate {
  const attachment = image.attachmentId ? data.attachmentsById.get(image.attachmentId) : undefined;
  const width = toNumber(attachment?.width);
  const height = toNumber(attachment?.height);
  const candidate = {
    attachmentId: image.attachmentId,
    url: image.url,
    filename: image.filename,
    title: attachment?.title ?? image.filename,
    origin,
    width,
    height,
    mimeType: attachment?.mimeType || detectMimeType(image.filename, image.url),
    signals: [
      ...(image.reasons ?? []),
      ...dimensionSignals(width, height),
      ...filenameSignals(image.filename ?? ''),
    ],
  };

  return candidate;
}

function createCandidateFromBookMatch(
  candidate: BookCoverCandidate | null | undefined,
  origin: string,
): RecoveryImageCandidate | null {
  if (!candidate) {
    return null;
  }

  return {
    attachmentId: candidate.attachmentId,
    url: candidate.attachmentUrl,
    filename: candidate.filename,
    title: candidate.attachmentTitle,
    origin,
    width: candidate.width,
    height: candidate.height,
    mimeType: detectMimeType(candidate.filename, candidate.attachmentUrl),
    signals: [
      ...candidate.reasons.split(' | ').filter(Boolean),
      ...dimensionSignals(candidate.width, candidate.height),
      ...filenameSignals(candidate.filename),
      candidate.confidence === 'high'
        ? 'filename_or_title_matches_book'
        : 'low_confidence_cover_candidate',
    ],
  };
}

function extractBookCandidatesFromWxr(
  entry: ManifestEntry,
  data: RecoveryData,
): RecoveryImageCandidate[] {
  const item = data.wxrItemsByPostId.get(entry.sourceWpPostId);

  if (!item) {
    return [];
  }

  const dfiFeatured = getMetaValue(item, 'dfiFeatured');
  const imageUrls = extractImageUrlsFromHtml(item.content);
  const candidates: RecoveryImageCandidate[] = [];

  if (dfiFeatured) {
    candidates.push({
      attachmentId: dfiFeatured,
      url: data.attachmentsById.get(dfiFeatured)?.url ?? null,
      filename: data.attachmentsById.get(dfiFeatured)?.attachedFile ?? null,
      title: data.attachmentsById.get(dfiFeatured)?.title ?? null,
      origin: 'dfiFeatured',
      width: toNumber(data.attachmentsById.get(dfiFeatured)?.width),
      height: toNumber(data.attachmentsById.get(dfiFeatured)?.height),
      mimeType: data.attachmentsById.get(dfiFeatured)?.mimeType ?? null,
      signals: [
        'dfiFeatured',
        ...dimensionSignals(
          toNumber(data.attachmentsById.get(dfiFeatured)?.width),
          toNumber(data.attachmentsById.get(dfiFeatured)?.height),
        ),
      ],
    });
  }

  return [
    ...candidates,
    ...imageUrls.map((url) => ({
      attachmentId: null,
      url,
      filename: getFilenameFromUrl(url),
      title: getFilenameFromUrl(url),
      origin: 'content_html',
      width: null,
      height: null,
      mimeType: detectMimeType(getFilenameFromUrl(url), url),
      signals: ['content_html', ...filenameSignals(getFilenameFromUrl(url) ?? '')],
    })),
  ];
}

export function extractImageUrlsFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const pattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }

  return [...urls];
}

export function getMetaValue(item: WordPressItem, key: string): string {
  return item.metas.find((meta) => meta.key === key)?.value ?? '';
}

function scoreAuthorPhotoSignals(candidate: RecoveryImageCandidate, authorName: string): string[] {
  const normalizedFilename = normalizeText(candidate.filename ?? '');
  const normalizedNameParts = normalizeText(authorName)
    .split(' ')
    .filter((part) => part.length > 2);
  const hasPhotoWord = /foto|photo|autor|author|retrato|perfil/u.test(normalizedFilename);
  const hasNameWord = normalizedNameParts.some((part) => normalizedFilename.includes(part));
  const hasCoverWord = /libro|portada|cubierta|cover|book|isbn/u.test(normalizedFilename);

  return [
    ...(hasPhotoWord || hasNameWord ? ['filename_matches_author_or_photo'] : []),
    ...(hasCoverWord ? ['cover_signal_in_filename'] : []),
    ...(isPortraitOrSquare(candidate.width, candidate.height) ? ['portrait_or_square_ratio'] : []),
  ];
}

function filenameSignals(filename: string): string[] {
  const normalizedFilename = normalizeText(filename);

  return [
    ...(/libro|portada|cubierta|cover|book|isbn/u.test(normalizedFilename)
      ? ['cover_signal_in_filename']
      : []),
    ...(/foto|photo|autor|author|retrato|perfil/u.test(normalizedFilename)
      ? ['strong_author_photo_signal']
      : []),
  ];
}

function dimensionSignals(width: number | null, height: number | null): string[] {
  if (!width || !height) {
    return [];
  }

  const aspectRatio = width / height;

  return [
    ...(aspectRatio >= 0.58 && aspectRatio <= 0.78 ? ['cover_ratio'] : []),
    ...(aspectRatio >= 0.75 && aspectRatio <= 1.25 ? ['portrait_or_square_ratio'] : []),
  ];
}

function createTransformPlan(
  entityType: 'author' | 'book',
  errorCode: TechnicalImageErrorCode | null,
) {
  return {
    required: errorCode === 'IMAGE_TOO_LARGE',
    format: errorCode === 'IMAGE_TOO_LARGE' ? ('jpeg' as const) : null,
    maxWidth: errorCode === 'IMAGE_TOO_LARGE' ? (entityType === 'author' ? 1600 : 1800) : null,
    maxHeight: errorCode === 'IMAGE_TOO_LARGE' ? (entityType === 'author' ? 1600 : 2800) : null,
    quality: errorCode === 'IMAGE_TOO_LARGE' ? (entityType === 'author' ? 82 : 85) : null,
    correctExifOrientation: errorCode === 'IMAGE_TOO_LARGE',
    reason:
      errorCode === 'IMAGE_TOO_LARGE' ? 'Reducir imagen para cumplir limite de Storage.' : null,
  };
}

function createResult(
  generatedAt: string,
  mode: ImageRecoveryMode,
  items: RecoveryPlanItem[],
  manifestEntries: ManifestEntry[],
) {
  const technicalRetry = items.filter((item) => item.category === 'technical_retry').length;
  const safeAuthorPhoto = items.filter((item) => item.category === 'safe_author_photo').length;
  const safeBookCover = items.filter((item) => item.category === 'safe_book_cover').length;
  const ambiguous = items.filter((item) => item.category === 'ambiguous').length;
  const noCandidate = items.filter((item) => item.category === 'no_candidate').length;

  return {
    generatedAt,
    mode,
    totalPending: items.length,
    technicalRetry,
    safeAuthorPhoto,
    safeBookCover,
    ambiguous,
    noCandidate,
    automaticallyRecoverable: technicalRetry + safeAuthorPhoto + safeBookCover,
    applied: 0 as const,
    skippedAlreadyApplied: manifestEntries.filter(
      (entry) =>
        (entry.entityType === 'author_image' || entry.entityType === 'book_cover') &&
        entry.status === 'applied',
    ).length,
  };
}

function imageDecision(entityType: 'author' | 'book') {
  return entityType === 'author' ? 'upload_author_photo' : 'upload_book_cover';
}

function isPortraitOrSquare(width: number | null, height: number | null) {
  if (!width || !height) {
    return false;
  }

  const aspectRatio = width / height;

  return aspectRatio >= 0.55 && aspectRatio <= 1.25;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function detectMimeType(filename: string | null | undefined, url: string | null | undefined) {
  const value = `${filename ?? ''} ${url ?? ''}`.toLowerCase();

  if (value.includes('.jpg') || value.includes('.jpeg')) {
    return 'image/jpeg';
  }

  if (value.includes('.png')) {
    return 'image/png';
  }

  if (value.includes('.webp')) {
    return 'image/webp';
  }

  return null;
}

function getFilenameFromUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).pathname.split('/').at(-1) ?? null;
  } catch {
    return url.split('/').at(-1) ?? null;
  }
}

function toNumber(value: string | number | null | undefined): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function readOptionalJson<TData>(filePath: string, fallback: TData): Promise<TData> {
  try {
    return await readJson<TData>(filePath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

async function readCsv<TRow extends object>(filePath: string): Promise<TRow[]> {
  const content = await readFile(filePath, 'utf8');

  return parseCsv(content) as TRow[];
}

async function readWxrItems(inputPath: string | undefined): Promise<Map<string, WordPressItem>> {
  if (!inputPath) {
    return new Map();
  }

  const content = await readFile(inputPath, 'utf8');
  const channel = parseWxr(content);

  return new Map(channel.items.map((item) => [item.wpPostId, item]));
}
