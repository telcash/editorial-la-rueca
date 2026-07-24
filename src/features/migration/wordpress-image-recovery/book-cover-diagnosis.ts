import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseWxr } from '@/features/migration/wordpress-audit/parser';
import type { MigrationReport, WordPressItem } from '@/features/migration/wordpress-audit/types';
import { parseCsv } from './csv';

interface DiagnosisPaths {
  massDirectory: string;
  auditDirectory: string;
  xmlInputPath?: string;
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

interface BookRow {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  normalizedTitle: string;
  sourceAuthorTitle: string;
  sourceOldUrl: string;
  thumbnailId: string;
  thumbnailUrl: string;
}

interface EditionPlan {
  bookCandidateKey: string;
  edition?: {
    isbn10?: string | null;
    isbn13?: string | null;
  };
}

interface BookContext {
  item: RecoveryPlanItem;
  book: BookRow | undefined;
  wxrItem: WordPressItem | undefined;
  isbns: string[];
}

export interface BookCoverDiagnosisCandidate {
  origin: string;
  attachmentId: string | null;
  url: string | null;
  guid: string | null;
  filename: string | null;
  extension: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  ratio: number | null;
  size: number | null;
  slugMatch: boolean;
  titleMatch: boolean;
  isbnMatch: boolean;
  attachmentParentMatch: boolean;
  hasAuthorPhotoSignal: boolean;
  isExternal: boolean;
  score: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  explanation: string[];
}

export interface BookCoverDiagnosisItem {
  candidateKey: string;
  sourceWpPostId: string;
  title: string;
  slug: string;
  isbns: string[];
  candidateCount: number;
  strongestConfidence: 'high' | 'medium' | 'low' | 'none';
  strongestScore: number;
  causes: string[];
  candidates: BookCoverDiagnosisCandidate[];
}

export interface BookCoverStatistics {
  generatedAt: string;
  totalBooksAnalyzed: number;
  withoutAnyImage: number;
  onlyAuthorPhoto: number;
  hasStrongCandidate: number;
  hasMultipleCandidates: number;
  hasHtmlImages: number;
  hasExternalImages: number;
  hasRelatedAttachments: number;
  hasFilenameMatch: number;
  hasIsbnMatch: number;
  hasSlugMatch: number;
  hasTitleMatch: number;
  sourceDistribution: Record<string, number>;
  confidenceDistribution: Record<'high' | 'medium' | 'low' | 'none', number>;
  causeDistribution: Record<string, number>;
  topOpportunities: Array<{
    rule: string;
    recoverableCovers: number;
  }>;
  inspectedSources: {
    xmlInput: boolean;
    recoveryPlan: string;
    attachments: string;
    books: string;
    editions: string;
    migrationReport: string;
  };
}

export interface BookCoverDiagnosis {
  generatedAt: string;
  items: BookCoverDiagnosisItem[];
  statistics: BookCoverStatistics;
}

export async function diagnoseBookCovers(paths: DiagnosisPaths): Promise<BookCoverDiagnosis> {
  const massDirectory = path.resolve(paths.massDirectory);
  const auditDirectory = path.resolve(paths.auditDirectory);
  const recoveryPlanPath = path.join(massDirectory, 'image-recovery', 'recovery-plan.json');
  const attachmentsPath = path.join(auditDirectory, 'attachments-candidates.csv');
  const booksPath = path.join(auditDirectory, 'books-candidates.csv');
  const editionsPath = path.join(massDirectory, 'apply', 'editions.json');
  const migrationReportPath = path.join(auditDirectory, 'migration-report.json');

  const [recoveryPlan, attachments, books, editions, migrationReport, wxrItemsById] =
    await Promise.all([
      readJson<RecoveryPlanFile>(recoveryPlanPath),
      readCsv<AttachmentRow>(attachmentsPath),
      readCsv<BookRow>(booksPath),
      readJson<EditionPlan[]>(editionsPath),
      readJson<MigrationReport>(migrationReportPath),
      readWxrItems(paths.xmlInputPath),
    ]);

  const attachmentsById = new Map(
    attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const booksByKey = new Map(books.map((book) => [book.candidateKey, book]));
  const isbnsByBookKey = createIsbnMap(editions);
  const noCandidateBooks = recoveryPlan.items.filter(
    (item) => item.entityType === 'book' && item.category === 'no_candidate',
  );
  const items = noCandidateBooks.map((item) =>
    diagnoseBook({
      context: {
        item,
        book: booksByKey.get(item.candidateKey),
        wxrItem: wxrItemsById.get(item.sourceWpPostId),
        isbns: isbnsByBookKey.get(item.candidateKey) ?? [],
      },
      attachments,
      attachmentsById,
      migrationReport,
      wxrItemsById,
    }),
  );
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    items,
    statistics: createStatistics({
      generatedAt,
      items,
      xmlInput: Boolean(paths.xmlInputPath),
      recoveryPlanPath,
      attachmentsPath,
      booksPath,
      editionsPath,
      migrationReportPath,
    }),
  };
}

function diagnoseBook(params: {
  context: BookContext;
  attachments: AttachmentRow[];
  attachmentsById: Map<string, AttachmentRow>;
  migrationReport: MigrationReport;
  wxrItemsById: Map<string, WordPressItem>;
}): BookCoverDiagnosisItem {
  const { context, attachments, attachmentsById, migrationReport, wxrItemsById } = params;
  const candidates = [
    ...candidatesFromKnownFields(context, attachmentsById),
    ...candidatesFromWxr(context, attachmentsById),
    ...candidatesFromRelatedAttachments(context, attachments),
    ...candidatesFromWooCommerce(context, attachmentsById, migrationReport),
    ...candidatesFromSameDayAttachments(context, attachments, wxrItemsById),
  ]
    .map((candidate) => scoreCandidate(candidate, context))
    .sort((left, right) => right.score - left.score);
  const strongestScore = candidates[0]?.score ?? 0;
  const strongestConfidence = candidates[0]?.confidence ?? 'none';
  const causes = createCauses(candidates);

  return {
    candidateKey: context.item.candidateKey,
    sourceWpPostId: context.item.sourceWpPostId,
    title: context.item.title,
    slug: context.book?.sourceOldUrl ? getLastUrlSegment(context.book.sourceOldUrl) : '',
    isbns: context.isbns,
    candidateCount: candidates.length,
    strongestConfidence,
    strongestScore,
    causes,
    candidates,
  };
}

function candidatesFromKnownFields(
  context: BookContext,
  attachmentsById: Map<string, AttachmentRow>,
): CandidateDraft[] {
  const drafts: CandidateDraft[] = [];
  const thumbnailId = context.book?.thumbnailId;

  if (thumbnailId) {
    const thumbnailDraft = createAttachmentDraft(
      '_thumbnail_id',
      attachmentsById.get(thumbnailId),
      thumbnailId,
    );

    if (thumbnailDraft) {
      drafts.push(thumbnailDraft);
    }
  }

  for (const key of ['imagen_destacada_2', 'dfiFeatured']) {
    const value = getMetaValue(context.wxrItem, key);
    drafts.push(...draftsFromMetaValue(key, value, attachmentsById));
  }

  return drafts.filter(BooleanDraft);
}

function candidatesFromWxr(
  context: BookContext,
  attachmentsById: Map<string, AttachmentRow>,
): CandidateDraft[] {
  const item = context.wxrItem;

  if (!item) {
    return [];
  }

  const imageMetaDrafts = item.metas.flatMap((meta) =>
    isImageMetaKey(meta.key)
      ? draftsFromMetaValue(`custom_field:${meta.key}`, meta.value, attachmentsById)
      : [],
  );
  const contentUrls = [
    ...extractImageUrlsFromHtml(item.content, 'post_content_html'),
    ...extractImageUrlsFromShortcodes(item.content),
    ...extractImageUrlsFromGutenbergBlocks(item.content),
    ...extractImageUrlsFromSerializedAcf(item.metas),
  ];
  const guidDrafts = looksLikeImageUrl(item.guid) ? [createUrlDraft('guid', item.guid)] : [];

  return [...imageMetaDrafts, ...contentUrls, ...guidDrafts];
}

function candidatesFromRelatedAttachments(
  context: BookContext,
  attachments: AttachmentRow[],
): CandidateDraft[] {
  const normalizedTitle = normalizeText(context.item.title);
  const normalizedSlug = normalizeText(context.book?.normalizedTitle || context.item.candidateKey);
  const isbnTokens = context.isbns.map(normalizeIsbn);

  return attachments
    .filter((attachment) => {
      const haystack = normalizeText(
        `${attachment.attachedFile} ${attachment.title} ${attachment.slug} ${attachment.url}`,
      );
      const parentMatches = attachment.parentId === context.item.sourceWpPostId;
      const titleMatches =
        normalizedTitle.length > 3 && includesAllWords(haystack, normalizedTitle);
      const slugMatches = normalizedSlug.length > 3 && haystack.includes(normalizedSlug);
      const isbnMatches = isbnTokens.some((isbn) => isbn && haystack.includes(isbn));

      return parentMatches || titleMatches || slugMatches || isbnMatches;
    })
    .flatMap((attachment) => {
      const origins = [
        ...(attachment.parentId === context.item.sourceWpPostId ? ['attachment_parent_match'] : []),
        ...filenameSimilarityOrigins(attachment, context),
      ];

      return origins.map((origin) =>
        createAttachmentDraft(origin, attachment, attachment.wpPostId),
      );
    })
    .filter(BooleanDraft);
}

function candidatesFromWooCommerce(
  context: BookContext,
  attachmentsById: Map<string, AttachmentRow>,
  migrationReport: MigrationReport,
): CandidateDraft[] {
  return migrationReport.woocommerceAudit.products
    .filter((product) => {
      const haystack = normalizeText(`${product.title} ${product.slug} ${product.sku}`);
      const title = normalizeText(context.item.title);

      return (
        includesAllWords(haystack, title) ||
        context.isbns.some((isbn) => haystack.includes(normalizeIsbn(isbn)))
      );
    })
    .map((product) =>
      createAttachmentDraft(
        'woocommerce_related',
        attachmentsById.get(product.thumbnailId),
        product.thumbnailId,
      ),
    )
    .filter(BooleanDraft);
}

function candidatesFromSameDayAttachments(
  context: BookContext,
  attachments: AttachmentRow[],
  wxrItemsById: Map<string, WordPressItem>,
): CandidateDraft[] {
  if (!context.wxrItem?.createdAt) {
    return [];
  }

  const sourceDay = context.wxrItem.createdAt.slice(0, 10);

  return attachments
    .filter(
      (attachment) => wxrItemsById.get(attachment.wpPostId)?.createdAt.slice(0, 10) === sourceDay,
    )
    .filter((attachment) => attachment.wpPostId !== context.book?.thumbnailId)
    .map((attachment) =>
      createAttachmentDraft('attachment_same_day', attachment, attachment.wpPostId),
    )
    .filter(BooleanDraft);
}

interface CandidateDraft {
  origin: string;
  attachmentId: string | null;
  url: string | null;
  guid: string | null;
  filename: string | null;
  title: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
}

function scoreCandidate(draft: CandidateDraft, context: BookContext): BookCoverDiagnosisCandidate {
  const filename = draft.filename ?? getFilenameFromUrl(draft.url);
  const extension = getExtension(filename ?? draft.url);
  const ratio = draft.width && draft.height ? round(draft.width / draft.height) : null;
  const haystack = normalizeText(`${filename ?? ''} ${draft.title ?? ''} ${draft.url ?? ''}`);
  const title = normalizeText(context.item.title);
  const slug = normalizeText(context.book?.normalizedTitle || context.item.candidateKey);
  const slugMatch = slug.length > 3 && haystack.includes(slug);
  const titleMatch = title.length > 3 && includesAllWords(haystack, title);
  const isbnMatch = context.isbns.some((isbn) => {
    const normalizedIsbn = normalizeIsbn(isbn);

    return normalizedIsbn.length > 0 && haystack.includes(normalizedIsbn);
  });
  const attachmentParentMatch = draft.origin === 'attachment_parent_match';
  const hasAuthorPhotoSignal = /foto|photo|autor|author|retrato|perfil/u.test(haystack);
  const coverSignal = /libro|portada|cubierta|cover|book|isbn/u.test(haystack);
  const coverRatio = ratio !== null && ratio >= 0.55 && ratio <= 0.8;
  const isExternal = Boolean(draft.url && !draft.url.includes('editoriallarueca.com'));
  const explanation: string[] = [];
  let score = 0;

  if (titleMatch) {
    score += 40;
    explanation.push('filename/titulo coincide con el titulo del libro');
  }

  if (slugMatch) {
    score += 25;
    explanation.push('filename/titulo coincide con slug normalizado');
  }

  if (isbnMatch) {
    score += 45;
    explanation.push('filename/titulo contiene ISBN de la edicion');
  }

  if (attachmentParentMatch) {
    score += 30;
    explanation.push('attachment vinculado al post original');
  }

  if (coverSignal) {
    score += 20;
    explanation.push('contiene senal textual de portada/libro');
  }

  if (coverRatio) {
    score += 20;
    explanation.push('proporcion compatible con portada');
  }

  if (
    draft.origin.includes('html') ||
    draft.origin.includes('shortcode') ||
    draft.origin.includes('gutenberg')
  ) {
    score += 10;
    explanation.push('imagen encontrada en contenido HTML');
  }

  if (draft.origin === 'dfiFeatured' || draft.origin === 'imagen_destacada_2') {
    score += 20;
    explanation.push(`campo ${draft.origin}`);
  }

  if (draft.origin === 'woocommerce_related') {
    score += 25;
    explanation.push('producto WooCommerce relacionado');
  }

  if (hasAuthorPhotoSignal) {
    score -= 45;
    explanation.push('senal fuerte de foto de autor; no decidir como portada automaticamente');
  }

  if (score <= 0 && explanation.length === 0) {
    explanation.push('sin senales suficientes');
  }

  return {
    origin: draft.origin,
    attachmentId: draft.attachmentId,
    url: draft.url,
    guid: draft.guid,
    filename,
    extension,
    mimeType: draft.mimeType ?? detectMimeType(filename, draft.url),
    width: draft.width,
    height: draft.height,
    ratio,
    size: draft.size,
    slugMatch,
    titleMatch,
    isbnMatch,
    attachmentParentMatch,
    hasAuthorPhotoSignal,
    isExternal,
    score,
    confidence: confidenceForScore(score),
    explanation,
  };
}

function createStatistics(params: {
  generatedAt: string;
  items: BookCoverDiagnosisItem[];
  xmlInput: boolean;
  recoveryPlanPath: string;
  attachmentsPath: string;
  booksPath: string;
  editionsPath: string;
  migrationReportPath: string;
}): BookCoverStatistics {
  const { items } = params;
  const allCandidates = items.flatMap((item) => item.candidates);
  const sourceDistribution = countBy(allCandidates.map((candidate) => candidate.origin));
  const confidenceDistribution = {
    high: allCandidates.filter((candidate) => candidate.confidence === 'high').length,
    medium: allCandidates.filter((candidate) => candidate.confidence === 'medium').length,
    low: allCandidates.filter((candidate) => candidate.confidence === 'low').length,
    none: allCandidates.filter((candidate) => candidate.confidence === 'none').length,
  };
  const causeDistribution = countBy(items.flatMap((item) => item.causes));

  return {
    generatedAt: params.generatedAt,
    totalBooksAnalyzed: items.length,
    withoutAnyImage: items.filter((item) => item.candidateCount === 0).length,
    onlyAuthorPhoto: items.filter(
      (item) =>
        item.candidates.length > 0 &&
        item.candidates.every((candidate) => candidate.hasAuthorPhotoSignal),
    ).length,
    hasStrongCandidate: items.filter((item) =>
      item.candidates.some(
        (candidate) => candidate.confidence === 'high' && !candidate.hasAuthorPhotoSignal,
      ),
    ).length,
    hasMultipleCandidates: items.filter((item) => item.candidateCount > 1).length,
    hasHtmlImages: items.filter((item) =>
      item.candidates.some((candidate) => candidate.origin.includes('html')),
    ).length,
    hasExternalImages: items.filter((item) =>
      item.candidates.some((candidate) => candidate.isExternal),
    ).length,
    hasRelatedAttachments: items.filter((item) =>
      item.candidates.some((candidate) => candidate.attachmentParentMatch),
    ).length,
    hasFilenameMatch: items.filter((item) =>
      item.candidates.some((candidate) => candidate.titleMatch || candidate.slugMatch),
    ).length,
    hasIsbnMatch: items.filter((item) => item.candidates.some((candidate) => candidate.isbnMatch))
      .length,
    hasSlugMatch: items.filter((item) => item.candidates.some((candidate) => candidate.slugMatch))
      .length,
    hasTitleMatch: items.filter((item) => item.candidates.some((candidate) => candidate.titleMatch))
      .length,
    sourceDistribution,
    confidenceDistribution,
    causeDistribution,
    topOpportunities: createTopOpportunities(items),
    inspectedSources: {
      xmlInput: params.xmlInput,
      recoveryPlan: path.relative(process.cwd(), params.recoveryPlanPath),
      attachments: path.relative(process.cwd(), params.attachmentsPath),
      books: path.relative(process.cwd(), params.booksPath),
      editions: path.relative(process.cwd(), params.editionsPath),
      migrationReport: path.relative(process.cwd(), params.migrationReportPath),
    },
  };
}

function createTopOpportunities(items: BookCoverDiagnosisItem[]) {
  const rules = [
    {
      rule: 'filename_or_title_match_without_author_photo_signal',
      recoverableCovers: countBooksByCandidate(items, (candidate) =>
        Boolean((candidate.titleMatch || candidate.slugMatch) && !candidate.hasAuthorPhotoSignal),
      ),
    },
    {
      rule: 'attachment_parent_match',
      recoverableCovers: countBooksByCandidate(
        items,
        (candidate) => candidate.attachmentParentMatch,
      ),
    },
    {
      rule: 'cover_ratio_plus_cover_keyword',
      recoverableCovers: countBooksByCandidate(items, (candidate) =>
        Boolean(
          candidate.ratio &&
          candidate.ratio >= 0.55 &&
          candidate.ratio <= 0.8 &&
          candidate.score >= 40,
        ),
      ),
    },
    {
      rule: 'isbn_match',
      recoverableCovers: countBooksByCandidate(items, (candidate) => candidate.isbnMatch),
    },
    {
      rule: 'html_or_content_image',
      recoverableCovers: countBooksByCandidate(items, (candidate) =>
        candidate.origin.includes('html'),
      ),
    },
    {
      rule: 'woocommerce_related_thumbnail',
      recoverableCovers: countBooksByCandidate(
        items,
        (candidate) => candidate.origin === 'woocommerce_related',
      ),
    },
  ];

  return rules.sort((left, right) => right.recoverableCovers - left.recoverableCovers);
}

export function extractImageUrlsFromHtml(value: string, origin: string): CandidateDraft[] {
  return extractUrls(value).map((url) => createUrlDraft(origin, url));
}

export function extractImageUrlsFromShortcodes(value: string): CandidateDraft[] {
  const urls = new Set<string>();
  const pattern = /\[[^\]]*(?:image|gallery|caption)[^\]]*(?:src|url)=["']([^"']+)["'][^\]]*\]/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }

  return [...urls].map((url) => createUrlDraft('shortcode', url));
}

export function extractImageUrlsFromGutenbergBlocks(value: string): CandidateDraft[] {
  const urls = new Set<string>();
  const pattern = /<!--\s+wp:image[\s\S]*?-->|<!--\s+wp:gallery[\s\S]*?-->/giu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    for (const url of extractUrls(match[0] ?? '')) {
      urls.add(url);
    }
  }

  return [...urls].map((url) => createUrlDraft('gutenberg_block', url));
}

export function extractImageUrlsFromSerializedAcf(
  metas: Array<{ key: string; value: string }>,
): CandidateDraft[] {
  return metas
    .filter((meta) => /acf|image|imagen|foto|photo|cover|portada|gallery|galeria/iu.test(meta.key))
    .flatMap((meta) =>
      extractUrls(meta.value).map((url) => createUrlDraft(`acf_serialized:${meta.key}`, url)),
    );
}

function draftsFromMetaValue(
  origin: string,
  value: string,
  attachmentsById: Map<string, AttachmentRow>,
): CandidateDraft[] {
  if (!value) {
    return [];
  }

  const attachmentIds = extractNumericTokens(value);
  const urlDrafts = extractUrls(value).map((url) => createUrlDraft(origin, url));
  const attachmentDrafts = attachmentIds
    .map((attachmentId) =>
      createAttachmentDraft(origin, attachmentsById.get(attachmentId), attachmentId),
    )
    .filter(BooleanDraft);

  return [...attachmentDrafts, ...urlDrafts];
}

function createAttachmentDraft(
  origin: string,
  attachment: AttachmentRow | undefined,
  attachmentId: string,
): CandidateDraft | null {
  if (!attachment?.url && !attachment?.attachedFile) {
    return null;
  }

  return {
    origin,
    attachmentId,
    url: attachment.url || null,
    guid: null,
    filename: attachment.attachedFile || getFilenameFromUrl(attachment.url),
    title: attachment.title || null,
    mimeType: attachment.mimeType || null,
    width: toNumber(attachment.width),
    height: toNumber(attachment.height),
    size: null,
  };
}

function createUrlDraft(origin: string, url: string): CandidateDraft {
  return {
    origin,
    attachmentId: null,
    url,
    guid: null,
    filename: getFilenameFromUrl(url),
    title: getFilenameFromUrl(url),
    mimeType: detectMimeType(getFilenameFromUrl(url), url),
    width: null,
    height: null,
    size: null,
  };
}

async function readWxrItems(xmlInputPath: string | undefined) {
  if (!xmlInputPath) {
    return new Map<string, WordPressItem>();
  }

  const xml = await readFile(xmlInputPath, 'utf8');

  return new Map(parseWxr(xml).items.map((item) => [item.wpPostId, item]));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

async function readCsv<T>(filePath: string): Promise<T[]> {
  return parseCsv(await readFile(filePath, 'utf8')) as T[];
}

function createIsbnMap(editions: EditionPlan[]) {
  const map = new Map<string, string[]>();

  for (const edition of editions) {
    const isbns = [edition.edition?.isbn10, edition.edition?.isbn13].filter(
      (isbn): isbn is string => Boolean(isbn),
    );

    if (isbns.length > 0) {
      map.set(edition.bookCandidateKey, isbns);
    }
  }

  return map;
}

function getMetaValue(item: WordPressItem | undefined, key: string) {
  return item?.metas.find((meta) => meta.key === key)?.value ?? '';
}

function isImageMetaKey(key: string) {
  return /image|imagen|foto|photo|thumbnail|thumb|cover|portada|featured|gallery|galeria/iu.test(
    key,
  );
}

function filenameSimilarityOrigins(attachment: AttachmentRow, context: BookContext) {
  const haystack = normalizeText(
    `${attachment.attachedFile} ${attachment.title} ${attachment.slug}`,
  );
  const title = normalizeText(context.item.title);
  const slug = normalizeText(context.book?.normalizedTitle || context.item.candidateKey);
  const isbns = context.isbns.map(normalizeIsbn);

  return [
    ...(title.length > 3 && includesAllWords(haystack, title) ? ['filename_title_match'] : []),
    ...(slug.length > 3 && haystack.includes(slug) ? ['filename_slug_match'] : []),
    ...(isbns.some((isbn) => isbn && haystack.includes(isbn)) ? ['filename_isbn_match'] : []),
  ];
}

function createCauses(candidates: BookCoverDiagnosisCandidate[]) {
  return [
    ...(candidates.length === 0 ? ['without_any_image'] : []),
    ...(candidates.length > 1 ? ['multiple_candidates'] : []),
    ...(candidates.some((candidate) => candidate.hasAuthorPhotoSignal)
      ? ['author_photo_signal']
      : []),
    ...(candidates.some((candidate) => candidate.confidence === 'high')
      ? ['strong_candidate']
      : []),
    ...(candidates.some((candidate) => candidate.origin.includes('html')) ? ['html_images'] : []),
    ...(candidates.some((candidate) => candidate.isExternal) ? ['external_images'] : []),
    ...(candidates.some((candidate) => candidate.attachmentParentMatch)
      ? ['related_attachments']
      : []),
    ...(candidates.some((candidate) => candidate.titleMatch) ? ['title_match'] : []),
    ...(candidates.some((candidate) => candidate.slugMatch) ? ['slug_match'] : []),
    ...(candidates.some((candidate) => candidate.isbnMatch) ? ['isbn_match'] : []),
  ];
}

function countBooksByCandidate(
  items: BookCoverDiagnosisItem[],
  predicate: (candidate: BookCoverDiagnosisCandidate) => boolean,
) {
  return items.filter((item) => item.candidates.some(predicate)).length;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;

    return counts;
  }, {});
}

function confidenceForScore(score: number): 'high' | 'medium' | 'low' | 'none' {
  if (score >= 80) {
    return 'high';
  }

  if (score >= 50) {
    return 'medium';
  }

  if (score > 0) {
    return 'low';
  }

  return 'none';
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeIsbn(value: string) {
  return value.replace(/[^0-9xX]/g, '').toLowerCase();
}

function includesAllWords(haystack: string, needle: string) {
  const words = needle.split(' ').filter((word) => word.length > 2);

  return words.length > 0 && words.every((word) => haystack.includes(word));
}

function extractNumericTokens(value: string) {
  return [...new Set((value.match(/\b\d{1,8}\b/gu) ?? []).filter((token) => token !== '0'))];
}

function extractUrls(value: string) {
  return [
    ...new Set(
      value.match(/https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|gif)(?:\?[^\s"'<>]*)?/giu) ?? [],
    ),
  ];
}

function looksLikeImageUrl(value: string) {
  return /\.(?:jpe?g|png|webp|gif)(?:\?.*)?$/iu.test(value);
}

function getFilenameFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const withoutQuery = value.split('?')[0] ?? value;
  const filename = withoutQuery.split('/').filter(Boolean).at(-1);

  return filename ?? null;
}

function getExtension(value: string | null | undefined) {
  const filename = getFilenameFromUrl(value) ?? value;
  const match = /\.([a-z0-9]+)$/iu.exec(filename ?? '');

  return match?.[1]?.toLowerCase() ?? null;
}

function getLastUrlSegment(value: string) {
  return value.split('/').filter(Boolean).at(-1) ?? '';
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

  if (value.includes('.gif')) {
    return 'image/gif';
  }

  return null;
}

function toNumber(value: string | undefined) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function BooleanDraft<T>(value: T | null): value is T {
  return value !== null;
}
