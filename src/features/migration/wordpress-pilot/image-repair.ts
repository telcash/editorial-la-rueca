import type { PilotAttachmentCandidate, PilotAuditData, PilotManifest, PilotPlan } from './types';
import { getAttachmentAspectRatioSignal, getAttachmentFilenameSignal } from './planner';

type ProbableImageRole = 'author_photo' | 'book_cover' | 'ambiguous' | 'none';
type RepairAction =
  | 'replace_book_cover'
  | 'set_author_photo'
  | 'clear_wrong_book_cover'
  | 'manual_review'
  | 'no_change';

export interface AttachmentEvidence {
  attachmentId: string | null;
  url: string | null;
  filename: string | null;
  title: string | null;
  alt: string | null;
  meta: string | null;
  width: number | null;
  height: number | null;
  parentId: string | null;
  filenameSignal: string;
  aspectRatioSignal: string;
}

export interface ImageRepairPlanEntry {
  candidateKey: string;
  sourceWpPostId: string;
  entityType: 'author' | 'book';
  currentUrl: string | null;
  currentRole: string;
  thumbnail: AttachmentEvidence;
  imageField: AttachmentEvidence;
  proposedAttachmentId: string | null;
  proposedUrl: string | null;
  proposedRole: ProbableImageRole;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  action: RepairAction;
}

interface ImageFieldStats {
  totalWithField: number;
  distinctFromThumbnail: number;
  authorPhotoSignals: number;
  bookCoverSignals: number;
  mixedSignals: number;
  conclusion: 'LIKELY_BOOK_COVER' | 'LIKELY_AUTHOR_PHOTO' | 'MIXED_USAGE';
}

export interface ImageRepairPlan {
  generatedAt: string;
  summary: {
    thumbnailId: ImageFieldStats;
    imageFieldId: ImageFieldStats;
    highConfidence: number;
    manualReview: number;
    notes: string[];
  };
  entries: ImageRepairPlanEntry[];
}

function toNumberOrNull(value: string): number | null {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function createAttachmentEvidence(
  attachmentId: string,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
): AttachmentEvidence {
  const attachment = attachmentsById.get(attachmentId);

  if (!attachmentId || !attachment) {
    return {
      attachmentId: attachmentId || null,
      url: null,
      filename: null,
      title: null,
      alt: null,
      meta: null,
      width: null,
      height: null,
      parentId: null,
      filenameSignal: 'unknown',
      aspectRatioSignal: 'unknown',
    };
  }

  return {
    attachmentId,
    url: attachment.url || null,
    filename: attachment.attachedFile || null,
    title: attachment.title || null,
    alt: null,
    meta: null,
    width: toNumberOrNull(attachment.width),
    height: toNumberOrNull(attachment.height),
    parentId: attachment.parentId || null,
    filenameSignal: getAttachmentFilenameSignal(attachment),
    aspectRatioSignal: getAttachmentAspectRatioSignal(attachment),
  };
}

function classifyEvidence(evidence: AttachmentEvidence): ProbableImageRole {
  if (!evidence.url) {
    return 'none';
  }

  if (evidence.filenameSignal === 'author_photo') {
    return 'author_photo';
  }

  if (
    evidence.filenameSignal === 'book_cover' &&
    evidence.aspectRatioSignal === 'possible_book_cover'
  ) {
    return 'book_cover';
  }

  return 'ambiguous';
}

function getCurrentUrl(manifest: PilotManifest, candidateKey: string): string | null {
  const entry = manifest.entries.find(
    (manifestEntry) =>
      manifestEntry.sourceType === 'image' && manifestEntry.candidateKey === candidateKey,
  );
  const resultingUrl = entry?.sourceMetadata.resultingUrl;

  return typeof resultingUrl === 'string' && resultingUrl.length > 0 ? resultingUrl : null;
}

function getCurrentRole(manifest: PilotManifest, plan: PilotPlan, candidateKey: string) {
  const manifestEntry = manifest.entries.find(
    (entry) => entry.sourceType === 'image' && entry.candidateKey === candidateKey,
  );
  const manifestRole = manifestEntry?.sourceMetadata.role;

  if (typeof manifestRole === 'string' && manifestRole.length > 0) {
    return manifestRole;
  }

  return plan.images.find((image) => image.candidateKey === candidateKey)?.role ?? 'none';
}

function chooseAuthorRepairAction(
  thumbnailRole: ProbableImageRole,
  imageFieldRole: ProbableImageRole,
): {
  action: RepairAction;
  proposedRole: ProbableImageRole;
  confidence: ImageRepairPlanEntry['confidence'];
  proposedSource: 'thumbnail' | 'imageField' | null;
  reasons: string[];
} {
  if (imageFieldRole === 'author_photo') {
    return {
      action: 'set_author_photo',
      proposedRole: 'author_photo',
      confidence: 'high',
      proposedSource: 'imageField',
      reasons: ['imagen_destacada_2 tiene señales fuertes de foto de autor.'],
    };
  }

  if (thumbnailRole === 'author_photo') {
    return {
      action: 'set_author_photo',
      proposedRole: 'author_photo',
      confidence: 'high',
      proposedSource: 'thumbnail',
      reasons: ['_thumbnail_id tiene señales fuertes de foto de autor.'],
    };
  }

  if (thumbnailRole === 'none' && imageFieldRole === 'none') {
    return {
      action: 'no_change',
      proposedRole: 'none',
      confidence: 'low',
      proposedSource: null,
      reasons: ['No hay imagen candidata resuelta para el autor.'],
    };
  }

  return {
    action: 'manual_review',
    proposedRole: 'ambiguous',
    confidence: 'low',
    proposedSource: null,
    reasons: ['No hay señales suficientes para asignar foto de autor automaticamente.'],
  };
}

function chooseBookRepairAction(
  currentRole: string,
  thumbnailRole: ProbableImageRole,
  imageFieldRole: ProbableImageRole,
): {
  action: RepairAction;
  proposedRole: ProbableImageRole;
  confidence: ImageRepairPlanEntry['confidence'];
  proposedSource: 'thumbnail' | 'imageField' | null;
  reasons: string[];
} {
  if (imageFieldRole === 'book_cover') {
    return {
      action: 'replace_book_cover',
      proposedRole: 'book_cover',
      confidence: 'high',
      proposedSource: 'imageField',
      reasons: ['imagen_destacada_2 tiene señales fuertes de portada.'],
    };
  }

  if (thumbnailRole === 'book_cover') {
    return {
      action: 'replace_book_cover',
      proposedRole: 'book_cover',
      confidence: 'high',
      proposedSource: 'thumbnail',
      reasons: ['_thumbnail_id tiene señales fuertes de portada.'],
    };
  }

  if (currentRole === 'safe_book_cover' && thumbnailRole === 'author_photo') {
    return {
      action: 'clear_wrong_book_cover',
      proposedRole: 'author_photo',
      confidence: 'high',
      proposedSource: 'thumbnail',
      reasons: [
        'La portada planificada procede de _thumbnail_id, pero filename/titulo indican foto de autor.',
      ],
    };
  }

  if (currentRole === 'safe_book_cover') {
    return {
      action: 'clear_wrong_book_cover',
      proposedRole: 'ambiguous',
      confidence: 'low',
      proposedSource: null,
      reasons: [
        'No hay portada segura para mantener coverUrl; es preferible limpiarla antes que conservar una imagen dudosa.',
      ],
    };
  }

  return {
    action: 'manual_review',
    proposedRole: 'ambiguous',
    confidence: 'low',
    proposedSource: null,
    reasons: [
      'No hay portada segura; es preferible dejar coverUrl en null antes que usar una foto.',
    ],
  };
}

function resolveProposedEvidence(
  source: 'thumbnail' | 'imageField' | null,
  thumbnail: AttachmentEvidence,
  imageField: AttachmentEvidence,
) {
  if (source === 'thumbnail') {
    return thumbnail;
  }

  if (source === 'imageField') {
    return imageField;
  }

  return null;
}

function createStats(
  data: PilotAuditData,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
  field: 'thumbnailId' | 'imageFieldId',
): ImageFieldStats {
  let totalWithField = 0;
  let distinctFromThumbnail = 0;
  let authorPhotoSignals = 0;
  let bookCoverSignals = 0;
  let mixedSignals = 0;

  for (const author of data.authors) {
    const attachmentId = author[field];

    if (!attachmentId) {
      continue;
    }

    totalWithField += 1;

    if (field === 'imageFieldId' && attachmentId !== author.thumbnailId) {
      distinctFromThumbnail += 1;
    }

    const evidence = createAttachmentEvidence(attachmentId, attachmentsById);
    const role = classifyEvidence(evidence);

    if (role === 'author_photo') {
      authorPhotoSignals += 1;
      continue;
    }

    if (role === 'book_cover') {
      bookCoverSignals += 1;
      continue;
    }

    mixedSignals += 1;
  }

  const conclusion =
    authorPhotoSignals > 0 && bookCoverSignals === 0
      ? 'LIKELY_AUTHOR_PHOTO'
      : bookCoverSignals > 0 && authorPhotoSignals === 0
        ? 'LIKELY_BOOK_COVER'
        : 'MIXED_USAGE';

  return {
    totalWithField,
    distinctFromThumbnail,
    authorPhotoSignals,
    bookCoverSignals,
    mixedSignals,
    conclusion,
  };
}

export function createImageRepairPlan(
  data: PilotAuditData,
  plan: PilotPlan,
  existingManifest: PilotManifest | null,
): ImageRepairPlan {
  const manifest = existingManifest ?? plan.manifest;
  const attachmentsById = new Map(
    data.attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const selectedAuthorKeys = new Set(plan.authors.map((author) => author.candidateKey));
  const selectedAuthors = data.authors.filter((author) =>
    selectedAuthorKeys.has(author.candidateKey),
  );
  const authorsBySourcePostId = new Map(
    data.authors.map((author) => [author.sourceWpPostId, author]),
  );
  const booksByPlanIdentity = new Map(
    data.books.map((book) => [`${book.candidateKey}:${book.sourceWpPostId}`, book]),
  );
  const entries: ImageRepairPlanEntry[] = [];

  for (const author of selectedAuthors) {
    const thumbnail = createAttachmentEvidence(author.thumbnailId, attachmentsById);
    const imageField = createAttachmentEvidence(author.imageFieldId, attachmentsById);
    const thumbnailRole = classifyEvidence(thumbnail);
    const imageFieldRole = classifyEvidence(imageField);
    const proposal = chooseAuthorRepairAction(thumbnailRole, imageFieldRole);
    const proposedEvidence = resolveProposedEvidence(
      proposal.proposedSource,
      thumbnail,
      imageField,
    );

    entries.push({
      candidateKey: author.candidateKey,
      sourceWpPostId: author.sourceWpPostId,
      entityType: 'author',
      currentUrl: getCurrentUrl(manifest, author.candidateKey),
      currentRole: getCurrentRole(manifest, plan, author.candidateKey),
      thumbnail,
      imageField,
      proposedAttachmentId: proposedEvidence?.attachmentId ?? null,
      proposedUrl: proposedEvidence?.url ?? null,
      proposedRole: proposal.proposedRole,
      confidence: proposal.confidence,
      reasons: proposal.reasons,
      action: proposal.action,
    });
  }

  for (const planBook of plan.books) {
    const book = booksByPlanIdentity.get(`${planBook.candidateKey}:${planBook.sourceWpPostId}`);

    if (!book) {
      continue;
    }

    const sourceAuthor = authorsBySourcePostId.get(book.sourceWpPostId);
    const thumbnail = createAttachmentEvidence(book.thumbnailId, attachmentsById);
    const imageField = createAttachmentEvidence(sourceAuthor?.imageFieldId ?? '', attachmentsById);
    const thumbnailRole = classifyEvidence(thumbnail);
    const imageFieldRole = classifyEvidence(imageField);
    const currentRole = getCurrentRole(manifest, plan, book.candidateKey);
    const proposal = chooseBookRepairAction(currentRole, thumbnailRole, imageFieldRole);
    const proposedEvidence = resolveProposedEvidence(
      proposal.proposedSource,
      thumbnail,
      imageField,
    );

    entries.push({
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      entityType: 'book',
      currentUrl: getCurrentUrl(manifest, book.candidateKey),
      currentRole,
      thumbnail,
      imageField,
      proposedAttachmentId: proposedEvidence?.attachmentId ?? null,
      proposedUrl: proposedEvidence?.url ?? null,
      proposedRole: proposal.proposedRole,
      confidence: proposal.confidence,
      reasons: proposal.reasons,
      action: proposal.action,
    });
  }

  return {
    generatedAt: plan.generatedAt,
    summary: {
      thumbnailId: createStats(data, attachmentsById, 'thumbnailId'),
      imageFieldId: createStats(data, attachmentsById, 'imageFieldId'),
      highConfidence: entries.filter((entry) => entry.confidence === 'high').length,
      manualReview: entries.filter((entry) => entry.action === 'manual_review').length,
      notes: [
        'Plan read-only: no modifica PostgreSQL ni Supabase Storage.',
        '_thumbnail_id en legacy no se considera portada segura sin senales adicionales.',
        'Los campos alt/meta no estan presentes en attachments-candidates.csv y se informan como null.',
      ],
    },
    entries,
  };
}
