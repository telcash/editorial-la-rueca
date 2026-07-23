import { createHash } from 'node:crypto';

import {
  createAuthorSchema,
  normalizeAuthorSlug,
  type CreateAuthorInput,
} from '@/schemas/authors/author.schema';
import { createBookSchema, type BookEditionInput } from '@/schemas/books/book.schema';
import { slugifyBookTitle } from '@/features/admin/books/lib/book-form.helpers';
import type {
  PilotAuditData,
  PilotAttachmentCandidate,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotDecisions,
  PilotImagePlan,
  PilotManifest,
  PilotManifestEntry,
  PilotPlan,
  PilotPlanAuthor,
  PilotPlanBook,
  PilotPlanEdition,
  PilotPlanIssue,
  PilotPlanRelation,
} from './types';

const placeholderEdition: BookEditionInput = {
  format: 'paperback',
  editionLabel: 'Datos pendientes de revisión',
  publicationDate: null,
  isbn10: null,
  isbn13: null,
  price: null,
  currency: 'EUR',
  pages: null,
  isAvailable: false,
  isFeatured: false,
  sortOrder: 0,
};

function toMapByCandidateKey<TCandidate extends { candidateKey: string }>(
  candidates: TCandidate[],
): Map<string, TCandidate> {
  return new Map(candidates.map((candidate) => [candidate.candidateKey, candidate]));
}

function getSelectedCandidateKeys(data: PilotAuditData) {
  const authorKeys = new Set<string>();
  const bookKeys = new Set<string>();

  for (const sampleCase of data.sample.cases) {
    if (sampleCase.authorCandidateKey) {
      authorKeys.add(sampleCase.authorCandidateKey);
    }

    if (sampleCase.bookCandidateKey) {
      bookKeys.add(sampleCase.bookCandidateKey);
    }
  }

  return { authorKeys, bookKeys };
}

function addIssue(
  issues: PilotPlanIssue[],
  issue: Omit<PilotPlanIssue, 'details'> & { details?: string },
) {
  issues.push({
    details: issue.details ?? '',
    ...issue,
  });
}

function createSourceMetadata(
  candidate: PilotAuthorCandidate | PilotBookCandidate,
): Record<string, string | boolean | null> {
  if ('name' in candidate) {
    return {
      sourceOldUrl: candidate.oldUrl || null,
      rawReview: candidate.rawReview || null,
      plainTextPreview: candidate.plainTextPreview || null,
      reviewLikelyType: candidate.reviewLikelyType || null,
      reviewConfidence: candidate.reviewConfidence || null,
      yoastMetaTitle: candidate.yoastMetaTitle || null,
      yoastMetaDescription: candidate.yoastMetaDescription || null,
      canonicalUrl: candidate.canonicalUrl || null,
      classification: candidate.classification || null,
      possibleDuplicateGroup: candidate.possibleDuplicateGroup || null,
    };
  }

  return {
    sourceOldUrl: candidate.sourceOldUrl || null,
    rawReview: candidate.rawReview || null,
    plainTextPreview: candidate.plainTextPreview || null,
    videoId: candidate.videoId || null,
    duplicateGroupId: candidate.duplicateGroupId || null,
    sourceAuthorTitle: candidate.sourceAuthorTitle || null,
    sourceAuthorSlug: candidate.sourceAuthorSlug || null,
  };
}

function isHighConfidenceReview(candidate: PilotAuthorCandidate | undefined, likelyType: string) {
  if (!candidate) {
    return false;
  }

  return (
    candidate.reviewLikelyType === likelyType &&
    ['high', 'medium'].includes(candidate.reviewConfidence)
  );
}

function createNoImagePlan(
  candidateKey: string,
  entityType: 'author' | 'book',
  sourceWpPostId: string,
): PilotImagePlan {
  return {
    candidateKey,
    entityType,
    sourceWpPostId,
    attachmentUrl: '',
    role: 'none',
    status: 'skipped',
    reason: 'No hay attachment resuelto para planificar subida.',
  };
}

function normalizeImageText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function getAttachmentFilenameSignal(
  attachment: Pick<PilotAttachmentCandidate, 'attachedFile' | 'title' | 'slug'> | undefined,
) {
  const text = normalizeImageText(
    [attachment?.attachedFile, attachment?.title, attachment?.slug].filter(Boolean).join(' '),
  );

  if (/\b(foto|author|autor|portrait|retrato)\b/.test(text) || text.includes('foto')) {
    return 'author_photo';
  }

  if (/\b(cover|portada|cubierta|mockup|book|libro)\b/.test(text)) {
    return 'book_cover';
  }

  return 'unknown';
}

export function getAttachmentAspectRatioSignal(
  attachment: Pick<PilotAttachmentCandidate, 'width' | 'height'> | undefined,
) {
  const width = Number(attachment?.width);
  const height = Number(attachment?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'unknown';
  }

  const ratio = width / height;

  if (ratio >= 0.55 && ratio <= 0.75) {
    return 'possible_book_cover';
  }

  if (ratio >= 0.8) {
    return 'possible_author_photo';
  }

  return 'unknown';
}

function createAuthorImagePlan(candidate: PilotAuthorCandidate): PilotImagePlan {
  if (!candidate.thumbnailUrl) {
    return createNoImagePlan(candidate.candidateKey, 'author', candidate.sourceWpPostId);
  }

  if (candidate.imageFieldUrl && candidate.imageFieldUrl !== candidate.thumbnailUrl) {
    return {
      candidateKey: candidate.candidateKey,
      entityType: 'author',
      sourceWpPostId: candidate.sourceWpPostId,
      attachmentUrl: candidate.thumbnailUrl,
      role: 'ambiguous',
      status: 'skipped',
      reason: '_thumbnail_id e imagen_destacada_2 apuntan a imagenes diferentes.',
    };
  }

  if (candidate.classification !== 'author_only_candidate') {
    return {
      candidateKey: candidate.candidateKey,
      entityType: 'author',
      sourceWpPostId: candidate.sourceWpPostId,
      attachmentUrl: candidate.thumbnailUrl,
      role: 'ambiguous',
      status: 'skipped',
      reason: 'Registro legacy combinado: la imagen puede ser foto de autor o portada de libro.',
    };
  }

  return {
    candidateKey: candidate.candidateKey,
    entityType: 'author',
    sourceWpPostId: candidate.sourceWpPostId,
    attachmentUrl: candidate.thumbnailUrl,
    role: 'safe_author_photo',
    status: 'planned',
    reason: 'Autor moderno con attachment unico resuelto.',
  };
}

function createBookImagePlan(
  book: PilotBookCandidate,
  sourceAuthor: PilotAuthorCandidate | undefined,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
): PilotImagePlan {
  if (!book.thumbnailUrl) {
    return createNoImagePlan(book.candidateKey, 'book', book.sourceWpPostId);
  }

  const thumbnailAttachment = attachmentsById.get(book.thumbnailId);
  const filenameSignal = getAttachmentFilenameSignal(thumbnailAttachment);
  const aspectRatioSignal = getAttachmentAspectRatioSignal(thumbnailAttachment);

  if (sourceAuthor?.imageFieldUrl && sourceAuthor.imageFieldUrl !== book.thumbnailUrl) {
    return {
      candidateKey: book.candidateKey,
      entityType: 'book',
      sourceWpPostId: book.sourceWpPostId,
      attachmentUrl: book.thumbnailUrl,
      role: 'ambiguous',
      status: 'skipped',
      reason: '_thumbnail_id e imagen_destacada_2 apuntan a imagenes diferentes.',
    };
  }

  if (filenameSignal === 'author_photo') {
    return {
      candidateKey: book.candidateKey,
      entityType: 'book',
      sourceWpPostId: book.sourceWpPostId,
      attachmentUrl: book.thumbnailUrl,
      role: 'ambiguous',
      status: 'skipped',
      reason:
        '_thumbnail_id legacy parece foto de autor por filename/titulo; no se clasifica como portada segura.',
    };
  }

  if (filenameSignal !== 'book_cover' || aspectRatioSignal !== 'possible_book_cover') {
    return {
      candidateKey: book.candidateKey,
      entityType: 'book',
      sourceWpPostId: book.sourceWpPostId,
      attachmentUrl: book.thumbnailUrl,
      role: 'ambiguous',
      status: 'skipped',
      reason:
        '_thumbnail_id legacy sin evidencias suficientes de portada; requiere revision manual.',
    };
  }

  return {
    candidateKey: book.candidateKey,
    entityType: 'book',
    sourceWpPostId: book.sourceWpPostId,
    attachmentUrl: book.thumbnailUrl,
    role: 'safe_book_cover',
    status: 'planned',
    reason: 'Libro legacy con filename y proporcion compatibles con portada.',
  };
}

function createAuthorPlan(
  candidate: PilotAuthorCandidate,
  issues: PilotPlanIssue[],
): PilotPlanAuthor {
  const warnings: string[] = [];
  const biography =
    candidate.classification === 'author_only_candidate' &&
    isHighConfidenceReview(candidate, 'author_bio')
      ? candidate.rawReview || null
      : null;
  const input: CreateAuthorInput = {
    name: candidate.name,
    slug: normalizeAuthorSlug(candidate.slug),
    shortBio: null,
    biography,
    photoUrl: null,
    websiteUrl: null,
    instagramUrl: null,
    facebookUrl: null,
    country: null,
    isFeatured: false,
    isPublished: false,
    sortOrder: 0,
  };
  const validation = createAuthorSchema.safeParse(input);
  let status: PilotPlanAuthor['status'] = validation.success ? 'planned' : 'blocked';

  if (!validation.success) {
    addIssue(issues, {
      severity: 'error',
      code: 'INVALID_AUTHOR_INPUT',
      candidateKey: candidate.candidateKey,
      sourceWpPostId: candidate.sourceWpPostId,
      message: 'El candidato de autor no supera la validacion del dominio.',
      details: validation.error.issues.map((issue) => issue.message).join(' | '),
    });
  }

  if (candidate.possibleDuplicateGroup) {
    warnings.push(`Posible duplicado de autor: ${candidate.possibleDuplicateGroup}.`);
  }

  if (candidate.classification === 'legacy_author_book_combined') {
    warnings.push('Registro legacy combinado: ta_resena no se persiste como biografia.');
  }

  if (status === 'planned' && warnings.length > 0) {
    status = 'planned';
  }

  return {
    candidateKey: candidate.candidateKey,
    sourceWpPostId: candidate.sourceWpPostId,
    input,
    warnings,
    sourceMetadata: createSourceMetadata(candidate),
    image: createAuthorImagePlan(candidate),
    status,
  };
}

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex');

  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(
    17,
    20,
  )}-${hash.slice(20, 32)}`;
}

function createBookPlan(
  book: PilotBookCandidate,
  relations: PilotPlanRelation[],
  authorsByKey: Map<string, PilotAuthorCandidate>,
  attachmentsById: Map<string, PilotAttachmentCandidate>,
  issues: PilotPlanIssue[],
  decisions: PilotDecisions,
): PilotPlanBook {
  const relatedAuthorKeys = relations
    .filter((relation) => relation.bookCandidateKey === book.candidateKey)
    .map((relation) => relation.authorCandidateKey);
  const sourceAuthor = authorsByKey.get(relatedAuthorKeys[0] ?? '');
  const warnings: string[] = [];
  const duplicateDecision = book.duplicateGroupId
    ? decisions.bookDuplicateGroups?.[book.duplicateGroupId]
    : undefined;
  let status: PilotPlanBook['status'] = 'planned';

  if (book.duplicateGroupId && !duplicateDecision) {
    status = 'blocked';
    warnings.push(`Requiere decision para duplicateGroupId ${book.duplicateGroupId}.`);
    addIssue(issues, {
      severity: 'error',
      code: 'DUPLICATE_BOOK_REQUIRES_DECISION',
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      message: 'El titulo pertenece a un grupo duplicado y necesita decisions.json antes de apply.',
      details: book.duplicateGroupId,
    });
  }

  if (
    book.duplicateGroupId &&
    duplicateDecision?.action === 'merge' &&
    duplicateDecision.canonicalCandidateKey !== book.candidateKey
  ) {
    status = 'skipped';
    warnings.push(`Fusionado en candidato canonico ${duplicateDecision.canonicalCandidateKey}.`);
  }

  if (book.duplicateGroupId && duplicateDecision?.action === 'skip') {
    status = 'skipped';
    warnings.push(`Omitido por decision explicita para ${book.duplicateGroupId}.`);
  }

  const description = isHighConfidenceReview(sourceAuthor, 'book_synopsis')
    ? book.rawReview || null
    : null;
  const input = {
    title: book.title,
    subtitle: null,
    slug: slugifyBookTitle(book.title),
    description,
    excerpt: null,
    coverUrl: null,
    originalPublicationDate: null,
    language: 'es',
    isFeatured: false,
    isPublished: false,
    sortOrder: 0,
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    authorCandidateKeys: relatedAuthorKeys,
    categoryIds: [],
    editions: [placeholderEdition],
  };
  const bookInputForValidation = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== 'authorCandidateKeys'),
  );
  const validation = createBookSchema.safeParse({
    ...bookInputForValidation,
    authorIds: relatedAuthorKeys.map((authorKey) => deterministicUuid(authorKey)),
  });

  if (!validation.success) {
    status = 'blocked';
    addIssue(issues, {
      severity: 'error',
      code: 'INVALID_BOOK_INPUT',
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      message: 'El candidato de libro no supera la validacion del dominio.',
      details: validation.error.issues.map((issue) => issue.message).join(' | '),
    });
  }

  if (relatedAuthorKeys.length === 0) {
    status = 'blocked';
    addIssue(issues, {
      severity: 'error',
      code: 'MISSING_BOOK_AUTHOR_RELATION',
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      message: 'El libro piloto no tiene relacion de autor de alta confianza.',
    });
  }

  return {
    candidateKey: book.candidateKey,
    sourceWpPostId: book.sourceWpPostId,
    input,
    warnings,
    requiresManualMergeDecision: status === 'blocked' && Boolean(book.duplicateGroupId),
    sourceMetadata: createSourceMetadata(book),
    image: createBookImagePlan(book, sourceAuthor, attachmentsById),
    status,
  };
}

function createManifestEntry(
  sourceType: PilotManifestEntry['sourceType'],
  sourceWpPostId: string,
  candidateKey: string,
  targetEntityType: string,
  status: PilotManifestEntry['status'],
  warnings: string[],
  sourceMetadata: Record<string, string | boolean | null>,
  createdAt: string,
  imageStatus = 'not_applicable',
  inferredEdition?: boolean,
): PilotManifestEntry {
  return {
    sourceType,
    sourceWpPostId,
    candidateKey,
    targetEntityType,
    targetId: null,
    status,
    warnings,
    sourceMetadata,
    imageStatus,
    createdAt,
    inferredEdition,
  };
}

function getExistingAppliedKeys(existingManifest?: PilotManifest) {
  return new Set(
    existingManifest?.entries
      .filter((entry) => entry.status === 'applied' && entry.targetId)
      .map((entry) => `${entry.sourceType}:${entry.candidateKey}`) ?? [],
  );
}

function mergeExistingManifestState(
  entries: PilotManifestEntry[],
  existingManifest?: PilotManifest,
): PilotManifestEntry[] {
  const existingEntriesByKey = new Map(
    existingManifest?.entries.map((entry) => [
      `${entry.sourceType}:${entry.candidateKey}`,
      entry,
    ]) ?? [],
  );

  return entries.map((entry) => {
    const existingEntry = existingEntriesByKey.get(`${entry.sourceType}:${entry.candidateKey}`);

    if (
      existingEntry?.sourceType === 'image' &&
      (existingEntry.imageStatus === 'manual_action_required' ||
        ((existingEntry.status === 'partial' || existingEntry.status === 'failed') &&
          existingEntry.imageStatus === 'failed'))
    ) {
      return {
        ...entry,
        status:
          existingEntry.imageStatus === 'manual_action_required' ? 'skipped' : existingEntry.status,
        targetId: existingEntry.targetId,
        imageStatus: existingEntry.imageStatus,
        checkpoint: existingEntry.checkpoint,
        sourceMetadata: {
          ...entry.sourceMetadata,
          ...existingEntry.sourceMetadata,
        },
      };
    }

    if (
      !existingEntry?.targetId ||
      (existingEntry.status !== 'applied' && existingEntry.status !== 'partial')
    ) {
      return entry;
    }

    return {
      ...entry,
      targetId: existingEntry.targetId,
      status: existingEntry.status,
      checkpoint: existingEntry.checkpoint,
      imageStatus: existingEntry.imageStatus,
      sourceMetadata: {
        ...entry.sourceMetadata,
        ...existingEntry.sourceMetadata,
      },
    };
  });
}

export function planPilotMigration(
  data: PilotAuditData,
  options: {
    auditSource: string;
    mode?: 'dry-run' | 'apply';
    existingManifest?: PilotManifest;
  },
): PilotPlan {
  const generatedAt = new Date().toISOString();
  const { authorKeys, bookKeys } = getSelectedCandidateKeys(data);
  const authorsByKey = toMapByCandidateKey(data.authors);
  const booksByKey = toMapByCandidateKey(data.books);
  const attachmentsById = new Map(
    data.attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const issues: PilotPlanIssue[] = [];
  const existingAppliedKeys = getExistingAppliedKeys(options.existingManifest);

  const relations: PilotPlanRelation[] = data.relationships
    .filter((relationship) => bookKeys.has(relationship.bookCandidateKey))
    .map((relationship) => {
      if (relationship.confidence !== 'high') {
        addIssue(issues, {
          severity: 'error',
          code: 'LOW_CONFIDENCE_RELATION_BLOCKED',
          candidateKey: relationship.bookCandidateKey,
          sourceWpPostId: relationship.sourceWpPostId,
          message: 'La relacion libro-autor no es de alta confianza.',
          details: relationship.reason,
        });
      }

      authorKeys.add(relationship.authorCandidateKey);

      return {
        bookCandidateKey: relationship.bookCandidateKey,
        authorCandidateKey: relationship.authorCandidateKey,
        sourceWpPostId: relationship.sourceWpPostId,
        confidence: relationship.confidence,
        reason: relationship.reason,
        status: relationship.confidence === 'high' ? 'planned' : 'blocked',
        warnings: [],
      };
    });

  const authors = [...authorKeys]
    .map((candidateKey) => authorsByKey.get(candidateKey))
    .filter((candidate): candidate is PilotAuthorCandidate => Boolean(candidate))
    .map((candidate) => createAuthorPlan(candidate, issues));

  const authorsBySlug = new Map<string, PilotPlanAuthor[]>();
  for (const author of authors) {
    const group = authorsBySlug.get(author.input.slug) ?? [];
    group.push(author);
    authorsBySlug.set(author.input.slug, group);
  }

  for (const [slug, group] of authorsBySlug) {
    if (group.length <= 1) {
      continue;
    }

    for (const author of group) {
      author.status = 'blocked';
      author.warnings.push(`Conflicto de slug en muestra piloto: ${slug}.`);
      addIssue(issues, {
        severity: 'error',
        code: 'AUTHOR_SLUG_CONFLICT_IN_PILOT',
        candidateKey: author.candidateKey,
        sourceWpPostId: author.sourceWpPostId,
        message: 'Dos o mas autores piloto comparten slug y requieren decision explicita.',
        details: slug,
      });
    }
  }

  const books = [...bookKeys]
    .map((candidateKey) => booksByKey.get(candidateKey))
    .filter((candidate): candidate is PilotBookCandidate => Boolean(candidate))
    .map((book) =>
      createBookPlan(book, relations, authorsByKey, attachmentsById, issues, data.decisions),
    );

  const authorStatusByKey = new Map(authors.map((author) => [author.candidateKey, author.status]));
  const bookStatusByKey = new Map(books.map((book) => [book.candidateKey, book.status]));

  for (const relation of relations) {
    const bookStatus = bookStatusByKey.get(relation.bookCandidateKey);
    const authorStatus = authorStatusByKey.get(relation.authorCandidateKey);

    if (relation.status === 'planned' && (bookStatus !== 'planned' || authorStatus !== 'planned')) {
      relation.status = 'blocked';
      relation.warnings.push('La relacion depende de un autor o libro no planificado.');
    }
  }

  const editions: PilotPlanEdition[] = books.map((book) => ({
    bookCandidateKey: book.candidateKey,
    editionLabel: 'Datos pendientes de revisión',
    format: 'paperback',
    inferredEdition: true,
    status: book.status,
  }));

  const images = [...authors.map((author) => author.image), ...books.map((book) => book.image)]
    .filter((image) => image.role !== 'none')
    .map((image) => {
      const parentStatus =
        image.entityType === 'author'
          ? authorStatusByKey.get(image.candidateKey)
          : bookStatusByKey.get(image.candidateKey);

      if (image.status === 'planned' && parentStatus !== 'planned') {
        return {
          ...image,
          status: 'blocked' as const,
          reason: `${image.reason} La entidad principal no esta planificada.`,
        };
      }

      return image;
    });

  for (const image of images) {
    if (image.status !== 'planned') {
      addIssue(issues, {
        severity: 'warning',
        code: 'IMAGE_SKIPPED_FOR_MANUAL_REVIEW',
        candidateKey: image.candidateKey,
        sourceWpPostId: image.sourceWpPostId,
        message: 'La imagen no se subira automaticamente en el piloto.',
        details: image.reason,
      });
    }
  }

  const manifestEntries = mergeExistingManifestState(
    [
      ...authors.map((author) =>
        createManifestEntry(
          'author',
          author.sourceWpPostId,
          author.candidateKey,
          'authors',
          existingAppliedKeys.has(`author:${author.candidateKey}`)
            ? 'skipped'
            : author.status === 'planned'
              ? 'planned'
              : 'skipped',
          author.warnings,
          author.sourceMetadata,
          generatedAt,
          author.image.status,
        ),
      ),
      ...books.map((book) =>
        createManifestEntry(
          'book',
          book.sourceWpPostId,
          book.candidateKey,
          'books',
          existingAppliedKeys.has(`book:${book.candidateKey}`)
            ? 'skipped'
            : book.status === 'planned'
              ? 'planned'
              : 'skipped',
          book.warnings,
          book.sourceMetadata,
          generatedAt,
          book.image.status,
        ),
      ),
      ...relations.map((relation) =>
        createManifestEntry(
          'relation',
          relation.sourceWpPostId,
          `${relation.bookCandidateKey}:${relation.authorCandidateKey}`,
          'book_authors',
          relation.status === 'planned' ? 'planned' : 'skipped',
          relation.warnings,
          {
            bookCandidateKey: relation.bookCandidateKey,
            authorCandidateKey: relation.authorCandidateKey,
            confidence: relation.confidence,
            reason: relation.reason,
          },
          generatedAt,
        ),
      ),
      ...editions.map((edition) =>
        createManifestEntry(
          'edition',
          '',
          edition.bookCandidateKey,
          'book_editions',
          edition.status === 'planned' ? 'planned' : 'skipped',
          ['Edicion minima inferida para cumplir el dominio actual.'],
          {
            editionLabel: edition.editionLabel,
            format: edition.format,
          },
          generatedAt,
          'not_applicable',
          true,
        ),
      ),
      ...images.map((image) =>
        createManifestEntry(
          'image',
          image.sourceWpPostId,
          image.candidateKey,
          image.entityType === 'author' ? 'author_images' : 'book_covers',
          image.status === 'planned' ? 'planned' : 'skipped',
          [image.reason],
          {
            entityType: image.entityType,
            role: image.role,
            attachmentUrl: image.attachmentUrl,
          },
          generatedAt,
          image.status,
        ),
      ),
    ],
    options.existingManifest,
  );

  return {
    generatedAt,
    mode: options.mode ?? 'dry-run',
    authors,
    books,
    relations,
    editions,
    images,
    issues,
    manifest: {
      generatedAt,
      auditSource: options.auditSource,
      entries: manifestEntries,
    },
  };
}
