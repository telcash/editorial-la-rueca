import type { ImageRepairPlan, ImageRepairPlanEntry } from './image-repair';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotManifest,
  PilotPlan,
  PilotRelationshipCandidate,
} from './types';
import { getAttachmentAspectRatioSignal, getAttachmentFilenameSignal } from './planner';

interface ReviewImage {
  origin: '_thumbnail_id' | 'imagen_destacada_2' | 'current_supabase_cover';
  attachmentId: string | null;
  filename: string | null;
  title: string | null;
  alt: string | null;
  meta: string | null;
  url: string | null;
  width: number | null;
  height: number | null;
  aspectRatio: number | null;
  parentId: string | null;
  filenameSignal: string;
  aspectRatioSignal: string;
  proposedRole: string;
  confidence: string;
  reasons: string[];
  proposedAction: string;
}

interface ReviewRecord {
  sourceWpPostId: string;
  authorCandidateKey: string;
  authorName: string;
  legacyBookTitle: string | null;
  relatedBookCandidateKeys: string[];
  records: {
    candidateKey: string;
    entityType: 'author' | 'book';
    currentMigratedRole: string;
    proposedRole: string;
    confidence: string;
    proposedAction: string;
    reasons: string[];
  }[];
  images: ReviewImage[];
}

type ReviewRecordDecision = ReviewRecord['records'][number];

interface SecondaryImagePatternRow {
  sourceWpPostId: string;
  authorName: string;
  legacyBookTitle: string | null;
  thumbnailFilename: string | null;
  secondaryFilename: string | null;
  thumbnailDimensions: string | null;
  secondaryDimensions: string | null;
  thumbnailAspectRatio: number | null;
  secondaryAspectRatio: number | null;
  thumbnailFilenameSignal: string;
  secondaryFilenameSignal: string;
  thumbnailAspectRatioSignal: string;
  secondaryAspectRatioSignal: string;
}

export interface ImageReviewSummary {
  generatedAt: string;
  records: ReviewRecord[];
  secondaryImagePattern: {
    total: number;
    rows: SecondaryImagePatternRow[];
    conclusion: 'LIKELY_BOOK_COVER' | 'LIKELY_AUTHOR_PHOTO' | 'MIXED_USAGE';
  };
}

function toNumberOrNull(value: string): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function getAspectRatio(width: number | null, height: number | null) {
  if (!width || !height) {
    return null;
  }

  return Number((width / height).toFixed(3));
}

function dimensionsLabel(width: number | null, height: number | null) {
  return width && height ? `${width}x${height}` : null;
}

function getAttachment(
  attachmentsById: Map<string, PilotAttachmentCandidate>,
  attachmentId: string,
) {
  return attachmentId ? attachmentsById.get(attachmentId) : undefined;
}

function getAttachmentImage(
  origin: '_thumbnail_id' | 'imagen_destacada_2',
  attachment: PilotAttachmentCandidate | undefined,
  repairEntry: ImageRepairPlanEntry | undefined,
): ReviewImage {
  const width = toNumberOrNull(attachment?.width ?? '');
  const height = toNumberOrNull(attachment?.height ?? '');

  return {
    origin,
    attachmentId: attachment?.wpPostId ?? null,
    filename: attachment?.attachedFile || null,
    title: attachment?.title || null,
    alt: null,
    meta: null,
    url: attachment?.url || null,
    width,
    height,
    aspectRatio: getAspectRatio(width, height),
    parentId: attachment?.parentId || null,
    filenameSignal: attachment ? getAttachmentFilenameSignal(attachment) : 'unknown',
    aspectRatioSignal: attachment ? getAttachmentAspectRatioSignal(attachment) : 'unknown',
    proposedRole: repairEntry?.proposedRole ?? 'ambiguous',
    confidence: repairEntry?.confidence ?? 'low',
    reasons: repairEntry?.reasons ?? [],
    proposedAction: repairEntry?.action ?? 'manual_review',
  };
}

function getCurrentCoverImage(
  manifest: PilotManifest,
  repairEntry: ImageRepairPlanEntry | undefined,
): ReviewImage | null {
  if (repairEntry?.entityType !== 'book') {
    return null;
  }

  const imageEntry = manifest.entries.find(
    (entry) => entry.sourceType === 'image' && entry.candidateKey === repairEntry.candidateKey,
  );
  const url = imageEntry?.sourceMetadata.resultingUrl;

  if (typeof url !== 'string' || !url) {
    return null;
  }

  return {
    origin: 'current_supabase_cover',
    attachmentId: null,
    filename: imageEntry?.targetId ?? null,
    title: 'Current Supabase cover',
    alt: null,
    meta: null,
    url,
    width: null,
    height: null,
    aspectRatio: null,
    parentId: null,
    filenameSignal: 'current_migrated_file',
    aspectRatioSignal: 'unknown',
    proposedRole: repairEntry.proposedRole,
    confidence: repairEntry.confidence,
    reasons: repairEntry.reasons,
    proposedAction: repairEntry.action,
  };
}

function getRelatedBookKeys(
  author: PilotAuthorCandidate,
  relations: PilotRelationshipCandidate[],
  plannedBookKeys: Set<string>,
) {
  return relations
    .filter(
      (relation) =>
        relation.authorCandidateKey === author.candidateKey &&
        plannedBookKeys.has(relation.bookCandidateKey),
    )
    .map((relation) => relation.bookCandidateKey);
}

function uniqueImages(images: ReviewImage[]) {
  const seen = new Set<string>();

  return images.filter((image) => {
    const key = `${image.origin}:${image.url ?? image.filename ?? image.attachmentId ?? ''}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getRepairEntry(
  repairPlan: ImageRepairPlan,
  entityType: 'author' | 'book',
  candidateKey: string,
) {
  return repairPlan.entries.find(
    (entry) => entry.entityType === entityType && entry.candidateKey === candidateKey,
  );
}

function createRecord(params: {
  author: PilotAuthorCandidate;
  legacyBook: PilotBookCandidate | undefined;
  relatedBookKeys: string[];
  attachmentsById: Map<string, PilotAttachmentCandidate>;
  repairPlan: ImageRepairPlan;
  manifest: PilotManifest;
}) {
  const { author, legacyBook, relatedBookKeys, attachmentsById, repairPlan, manifest } = params;
  const authorRepairEntry = getRepairEntry(repairPlan, 'author', author.candidateKey);
  const bookRepairEntries = relatedBookKeys
    .map((bookKey) => getRepairEntry(repairPlan, 'book', bookKey))
    .filter((entry): entry is ImageRepairPlanEntry => Boolean(entry));
  const thumbnail = getAttachment(attachmentsById, author.thumbnailId);
  const secondaryImage = getAttachment(attachmentsById, author.imageFieldId);
  const images = [
    getAttachmentImage('_thumbnail_id', thumbnail, authorRepairEntry),
    getAttachmentImage('imagen_destacada_2', secondaryImage, authorRepairEntry),
    ...bookRepairEntries
      .map((entry) => getCurrentCoverImage(manifest, entry))
      .filter((image): image is ReviewImage => Boolean(image)),
  ].filter((image) => image.url);
  const authorDecision: ReviewRecordDecision | null = authorRepairEntry
    ? {
        candidateKey: authorRepairEntry.candidateKey,
        entityType: authorRepairEntry.entityType,
        currentMigratedRole: authorRepairEntry.currentRole,
        proposedRole: authorRepairEntry.proposedRole,
        confidence: authorRepairEntry.confidence,
        proposedAction: authorRepairEntry.action,
        reasons: authorRepairEntry.reasons,
      }
    : null;
  const bookDecisions: ReviewRecordDecision[] = bookRepairEntries.map((entry) => ({
    candidateKey: entry.candidateKey,
    entityType: entry.entityType,
    currentMigratedRole: entry.currentRole,
    proposedRole: entry.proposedRole,
    confidence: entry.confidence,
    proposedAction: entry.action,
    reasons: entry.reasons,
  }));

  return {
    sourceWpPostId: author.sourceWpPostId,
    authorCandidateKey: author.candidateKey,
    authorName: author.name,
    legacyBookTitle: legacyBook?.title ?? null,
    relatedBookCandidateKeys: relatedBookKeys,
    records: [authorDecision, ...bookDecisions].filter((record): record is ReviewRecordDecision =>
      Boolean(record),
    ),
    images: uniqueImages(images),
  };
}

function createSecondaryPatternRows(
  data: PilotAuditData,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
) {
  const booksBySourcePostId = new Map(data.books.map((book) => [book.sourceWpPostId, book]));

  return data.authors
    .filter((author) => author.imageFieldId)
    .map((author) => {
      const thumbnail = getAttachment(attachmentsById, author.thumbnailId);
      const secondary = getAttachment(attachmentsById, author.imageFieldId);
      const thumbnailWidth = toNumberOrNull(thumbnail?.width ?? '');
      const thumbnailHeight = toNumberOrNull(thumbnail?.height ?? '');
      const secondaryWidth = toNumberOrNull(secondary?.width ?? '');
      const secondaryHeight = toNumberOrNull(secondary?.height ?? '');

      return {
        sourceWpPostId: author.sourceWpPostId,
        authorName: author.name,
        legacyBookTitle: booksBySourcePostId.get(author.sourceWpPostId)?.title ?? null,
        thumbnailFilename: thumbnail?.attachedFile || null,
        secondaryFilename: secondary?.attachedFile || null,
        thumbnailDimensions: dimensionsLabel(thumbnailWidth, thumbnailHeight),
        secondaryDimensions: dimensionsLabel(secondaryWidth, secondaryHeight),
        thumbnailAspectRatio: getAspectRatio(thumbnailWidth, thumbnailHeight),
        secondaryAspectRatio: getAspectRatio(secondaryWidth, secondaryHeight),
        thumbnailFilenameSignal: thumbnail ? getAttachmentFilenameSignal(thumbnail) : 'unknown',
        secondaryFilenameSignal: secondary ? getAttachmentFilenameSignal(secondary) : 'unknown',
        thumbnailAspectRatioSignal: thumbnail
          ? getAttachmentAspectRatioSignal(thumbnail)
          : 'unknown',
        secondaryAspectRatioSignal: secondary
          ? getAttachmentAspectRatioSignal(secondary)
          : 'unknown',
      };
    });
}

function concludeSecondaryPattern(rows: SecondaryImagePatternRow[]) {
  const authorSignals = rows.filter(
    (row) =>
      row.secondaryFilenameSignal === 'author_photo' &&
      row.secondaryAspectRatioSignal === 'possible_author_photo',
  ).length;
  const coverSignals = rows.filter(
    (row) =>
      row.secondaryFilenameSignal === 'book_cover' &&
      row.secondaryAspectRatioSignal === 'possible_book_cover',
  ).length;

  if (authorSignals > 0 && coverSignals === 0) {
    return 'LIKELY_AUTHOR_PHOTO' as const;
  }

  if (coverSignals > 0 && authorSignals === 0) {
    return 'LIKELY_BOOK_COVER' as const;
  }

  return 'MIXED_USAGE' as const;
}

export function createImageReviewSummary(
  data: PilotAuditData,
  plan: PilotPlan,
  manifest: PilotManifest,
  repairPlan: ImageRepairPlan,
): ImageReviewSummary {
  const attachmentsById = new Map(
    data.attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const plannedAuthorKeys = new Set(plan.authors.map((author) => author.candidateKey));
  const plannedBookKeys = new Set(plan.books.map((book) => book.candidateKey));
  const booksBySourcePostId = new Map(data.books.map((book) => [book.sourceWpPostId, book]));
  const records = data.authors
    .filter((author) => plannedAuthorKeys.has(author.candidateKey))
    .map((author) =>
      createRecord({
        author,
        legacyBook: booksBySourcePostId.get(author.sourceWpPostId),
        relatedBookKeys: getRelatedBookKeys(author, data.relationships, plannedBookKeys),
        attachmentsById,
        repairPlan,
        manifest,
      }),
    );
  const secondaryRows = createSecondaryPatternRows(data, attachmentsById);

  return {
    generatedAt: plan.generatedAt,
    records,
    secondaryImagePattern: {
      total: secondaryRows.length,
      rows: secondaryRows,
      conclusion: concludeSecondaryPattern(secondaryRows),
    },
  };
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderImage(image: ReviewImage) {
  return `
    <article class="image-card">
      <div class="image-frame">
        <img src="${escapeHtml(image.url)}" alt="${escapeHtml(
          `${image.origin} ${image.filename ?? ''}`,
        )}" loading="lazy">
      </div>
      <dl>
        <div><dt>Origen</dt><dd>${escapeHtml(image.origin)}</dd></div>
        <div><dt>Attachment</dt><dd>${escapeHtml(image.attachmentId ?? 'n/a')}</dd></div>
        <div><dt>Filename</dt><dd>${escapeHtml(image.filename)}</dd></div>
        <div><dt>URL</dt><dd><a href="${escapeHtml(image.url)}">${escapeHtml(image.url)}</a></dd></div>
        <div><dt>Dimensiones</dt><dd>${escapeHtml(dimensionsLabel(image.width, image.height) ?? 'n/a')}</dd></div>
        <div><dt>Aspect ratio</dt><dd>${escapeHtml(image.aspectRatio ?? 'n/a')}</dd></div>
        <div><dt>Parent</dt><dd>${escapeHtml(image.parentId ?? 'n/a')}</dd></div>
        <div><dt>Title</dt><dd>${escapeHtml(image.title)}</dd></div>
        <div><dt>Alt/meta</dt><dd>${escapeHtml([image.alt, image.meta].filter(Boolean).join(' / ') || 'n/a')}</dd></div>
        <div><dt>Filename signal</dt><dd>${escapeHtml(image.filenameSignal)}</dd></div>
        <div><dt>Aspect signal</dt><dd>${escapeHtml(image.aspectRatioSignal)}</dd></div>
        <div><dt>Rol propuesto</dt><dd>${escapeHtml(image.proposedRole)}</dd></div>
        <div><dt>Confidence</dt><dd>${escapeHtml(image.confidence)}</dd></div>
        <div><dt>Accion</dt><dd>${escapeHtml(image.proposedAction)}</dd></div>
      </dl>
      <p class="reasons">${escapeHtml(image.reasons.join(' '))}</p>
    </article>
  `;
}

function renderRecord(record: ReviewRecord) {
  return `
    <section class="record">
      <header>
        <p class="eyebrow">sourceWpPostId ${escapeHtml(record.sourceWpPostId)}</p>
        <h2>${escapeHtml(record.authorName)}</h2>
        <p><strong>AUTOR:</strong> ${escapeHtml(record.authorCandidateKey)}</p>
        <p><strong>LIBRO LEGACY:</strong> ${escapeHtml(record.legacyBookTitle ?? 'Sin tf_libro en el registro')}</p>
        <p><strong>Libros relacionados:</strong> ${escapeHtml(record.relatedBookCandidateKeys.join(', ') || 'n/a')}</p>
      </header>
      <div class="records">
        ${record.records
          .map(
            (item) => `
              <div class="decision">
                <strong>${escapeHtml(item.entityType)} · ${escapeHtml(item.candidateKey)}</strong>
                <span>actual: ${escapeHtml(item.currentMigratedRole)}</span>
                <span>propuesto: ${escapeHtml(item.proposedRole)}</span>
                <span>confidence: ${escapeHtml(item.confidence)}</span>
                <span>accion: ${escapeHtml(item.proposedAction)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
      <div class="image-grid">
        ${record.images.map((image) => renderImage(image)).join('')}
      </div>
    </section>
  `;
}

function renderSecondaryRows(rows: SecondaryImagePatternRow[]) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.sourceWpPostId)}</td>
          <td>${escapeHtml(row.authorName)}</td>
          <td>${escapeHtml(row.legacyBookTitle)}</td>
          <td>${escapeHtml(row.thumbnailFilename)}</td>
          <td>${escapeHtml(row.secondaryFilename)}</td>
          <td>${escapeHtml(row.thumbnailDimensions)}</td>
          <td>${escapeHtml(row.secondaryDimensions)}</td>
          <td>${escapeHtml(row.thumbnailAspectRatio)}</td>
          <td>${escapeHtml(row.secondaryAspectRatio)}</td>
          <td>${escapeHtml(row.thumbnailFilenameSignal)}</td>
          <td>${escapeHtml(row.secondaryFilenameSignal)}</td>
          <td>${escapeHtml(row.thumbnailAspectRatioSignal)}</td>
          <td>${escapeHtml(row.secondaryAspectRatioSignal)}</td>
        </tr>
      `,
    )
    .join('');
}

export function renderImageReviewHtml(summary: ImageReviewSummary) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revisión visual de imágenes piloto</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #171717; background: #f7f7f5; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px 56px; }
    h1, h2 { font-family: Georgia, serif; }
    a { color: #b91c1c; word-break: break-all; }
    .summary, .record, .pattern { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 0 0 22px; }
    .eyebrow { text-transform: uppercase; font-size: 12px; color: #666; letter-spacing: .08em; }
    .records { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0; }
    .decision { display: grid; gap: 4px; padding: 10px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; }
    .image-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .image-card { border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; background: #fff; }
    .image-frame { height: 320px; display: grid; place-items: center; background: #eee; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; }
    dl { display: grid; gap: 6px; padding: 12px; margin: 0; font-size: 13px; }
    dl div { display: grid; grid-template-columns: 110px 1fr; gap: 8px; }
    dt { font-weight: 700; color: #555; }
    dd { margin: 0; min-width: 0; }
    .reasons { padding: 0 12px 12px; margin: 0; font-size: 13px; color: #555; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e5e5e5; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #fafafa; position: sticky; top: 0; }
  </style>
</head>
<body>
<main>
  <section class="summary">
    <p class="eyebrow">Read-only</p>
    <h1>Revisión visual de imágenes piloto</h1>
    <p>Generado: ${escapeHtml(summary.generatedAt)}</p>
    <p>Registros piloto: ${escapeHtml(summary.records.length)}. Casos con imagen_destacada_2 analizados: ${escapeHtml(summary.secondaryImagePattern.total)}. Conclusión imagen_destacada_2: ${escapeHtml(summary.secondaryImagePattern.conclusion)}.</p>
  </section>
  ${summary.records.map((record) => renderRecord(record)).join('')}
  <section class="pattern">
    <h2>Patrón de imagen_destacada_2</h2>
    <p>Tabla de metadata para los ${escapeHtml(summary.secondaryImagePattern.total)} registros con imagen secundaria.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>source</th><th>autor</th><th>tf_libro</th><th>thumbnail</th><th>imagen_destacada_2</th>
            <th>thumb dim</th><th>img2 dim</th><th>thumb ratio</th><th>img2 ratio</th>
            <th>thumb filename signal</th><th>img2 filename signal</th><th>thumb aspect signal</th><th>img2 aspect signal</th>
          </tr>
        </thead>
        <tbody>${renderSecondaryRows(summary.secondaryImagePattern.rows)}</tbody>
      </table>
    </div>
  </section>
</main>
</body>
</html>
`;
}
