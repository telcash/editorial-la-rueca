import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  normalizeName,
  normalizeSlugComparison,
  stripHtmlForPreview,
} from '../wordpress-audit/normalize';
import { readPilotAuditData } from '../wordpress-pilot/audit-data';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
} from '../wordpress-pilot/types';
import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassConflict,
  MassRelationPlan,
} from './types';

export type DuplicateProposal =
  'MERGE_HIGH_CONFIDENCE' | 'KEEP_SEPARATE' | 'LIKELY_MERGE_MANUAL_CONFIRMATION' | 'MANUAL_REVIEW';

export interface MassResolutionInput {
  generatedAt?: string;
  mass: {
    authors: MassAuthorPlan[];
    books: MassBookPlan[];
    relations: MassRelationPlan[];
    conflicts: MassConflict[];
    authorImages: MassAuthorImagePlan[];
    bookCovers: MassBookCoverPlan[];
  };
  audit: PilotAuditData;
}

export interface AuthorDuplicateMember {
  candidateKey: string;
  sourceWpPostId: string;
  name: string;
  normalizedName: string;
  slug: string;
  oldUrl: string | null;
  classification: string | null;
  tfLibro: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  biographyPreview: string | null;
  rawReviewPreview: string | null;
  thumbnailId: string | null;
  thumbnailUrl: string | null;
  imageFieldId: string | null;
  imageFieldUrl: string | null;
  relatedBooks: Array<{ bookCandidateKey: string; title: string | null }>;
  yoastMetaTitle: string | null;
  yoastMetaDescription: string | null;
}

export interface AuthorDuplicateReviewGroup {
  groupId: string;
  proposal: DuplicateProposal;
  proposedAction: 'merge' | 'keep_separate' | 'manual_review';
  canonicalCandidateKey: string | null;
  mergeCandidates: string[];
  confidence: number;
  reasons: string[];
  fieldConflicts: string[];
  photoClassification:
    'SAME_IMAGE' | 'ONE_CLEAR_BEST_IMAGE' | 'MULTIPLE_CONFLICTING_IMAGES' | 'NO_IMAGE';
  canonicalPhoto: {
    authorCandidateKey: string;
    attachmentId: string;
    url: string | null;
    confidence: MassAuthorImagePlan['confidence'];
  } | null;
  proposedMergedData: Record<string, unknown>;
  members: AuthorDuplicateMember[];
}

export interface RelationResolutionSummary {
  before: {
    ready: number;
    blocked: number;
    manual: number;
  };
  causes: Record<string, number>;
  afterHighConfidence: {
    ready: number;
    stillBlocked: number;
    duplicateBookAuthorRelations: number;
    booksWithZeroAuthors: string[];
    multiAuthorBooks: Array<{ bookCandidateKey: string; authors: string[] }>;
  };
}

export interface BookRAnalysis {
  status: 'RECOVERABLE' | 'SKIP_RECOMMENDED' | 'MANUAL_REVIEW' | 'NOT_FOUND';
  sourceWpPostId: string | null;
  titleRaw: string | null;
  tfLibroRaw: string | null;
  normalizedTitle: string | null;
  author: string | null;
  rawReviewPreview: string | null;
  slug: string | null;
  attachments: Array<{ attachmentId: string; url: string | null; reason: string }>;
  oldUrl: string | null;
  hiddenCharacterEvidence: string[];
  reasons: string[];
}

export interface MassResolutionResult {
  generatedAt: string;
  authorDuplicateReview: {
    summary: {
      duplicateGroups: number;
      affectedRecords: number;
      mergeHighConfidence: number;
      likelyMergeManualConfirmation: number;
      keepSeparate: number;
      manualReview: number;
      expectedUniqueAuthorsAfterHighConfidence: number;
      legacyPattern: {
        groupsWithMultipleLegacyBookRows: number;
        distinctBooksAcrossDuplicateGroups: number;
      };
      conflictingAuthorPhotos: number;
    };
    groups: AuthorDuplicateReviewGroup[];
  };
  decisionsDraft: {
    generatedAt: string;
    note: string;
    authorDuplicateGroups: Record<
      string,
      {
        proposedAction: 'merge' | 'keep_separate' | 'manual_review';
        canonicalCandidateKey: string | null;
        mergeCandidates: string[];
        confidence: number;
        reasons: string[];
      }
    >;
  };
  relationResolution: RelationResolutionSummary;
  bookR: BookRAnalysis;
  otherBookBlockers: MassBookPlan[];
  postMergeSlugConflicts: Array<{ slug: string; candidateKeys: string[] }>;
  simulation: {
    before: {
      authorsReady: number;
      authorsBlocked: number;
      relationsReady: number;
      relationsBlocked: number;
      booksBlocked: number;
    };
    afterHighConfidence: {
      uniqueAuthorsExpected: number;
      authorsReady: number;
      authorsStillManual: number;
      relationsReady: number;
      relationsStillBlocked: number;
      booksReady: number;
      remainingBlockers: number;
    };
  };
}

interface MassResolutionFiles {
  duplicateReviewJson: string;
  duplicateReviewHtml: string;
  decisionsDraft: string;
  slugConflicts: string;
  simulation: string;
  blockersReviewHtml: string;
}

interface MassJsonFiles {
  authors: MassAuthorPlan[];
  books: MassBookPlan[];
  relations: MassRelationPlan[];
  conflicts: MassConflict[];
  authorImages: MassAuthorImagePlan[];
  bookCovers: MassBookCoverPlan[];
}

export async function readMassResolutionInput(
  massDirectory: string,
  auditDirectory: string,
): Promise<MassResolutionInput> {
  const resolvedMassDirectory = path.resolve(massDirectory);
  const [authors, books, relations, conflicts, authorImages, bookCovers, audit] = await Promise.all(
    [
      readJson<MassAuthorPlan[]>(path.join(resolvedMassDirectory, 'mass-authors.json')),
      readJson<MassBookPlan[]>(path.join(resolvedMassDirectory, 'mass-books.json')),
      readJson<MassRelationPlan[]>(path.join(resolvedMassDirectory, 'mass-relations.json')),
      readJson<MassConflict[]>(path.join(resolvedMassDirectory, 'mass-conflicts.json')),
      readJson<MassAuthorImagePlan[]>(path.join(resolvedMassDirectory, 'mass-author-images.json')),
      readJson<MassBookCoverPlan[]>(path.join(resolvedMassDirectory, 'mass-book-covers.json')),
      readPilotAuditData(auditDirectory, './migration/pilot/decisions.json'),
    ],
  );

  return {
    mass: {
      authors,
      books,
      relations,
      conflicts,
      authorImages,
      bookCovers,
    },
    audit,
  };
}

export function resolveMassBlockers(input: MassResolutionInput): MassResolutionResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const authorReviews = reviewAuthorDuplicates(input);
  const canonicalMap = createHighConfidenceCanonicalMap(authorReviews);
  const relationResolution = simulateRelations(input.mass, canonicalMap);
  const postMergeSlugConflicts = findPostMergeSlugConflicts(input.mass.authors, authorReviews);
  const bookR = analyzeBookR(input);
  const otherBookBlockers = input.mass.books.filter(
    (book) => book.status === 'BLOCKED' && book.candidateKey !== 'book:r',
  );
  const duplicateAffectedRecords = authorReviews.reduce(
    (total, group) => total + group.members.length,
    0,
  );
  const highConfidenceMergedRecords = authorReviews
    .filter((group) => group.proposal === 'MERGE_HIGH_CONFIDENCE')
    .reduce((total, group) => total + Math.max(0, group.members.length - 1), 0);
  const authorsReady = input.mass.authors.filter((author) => author.status === 'READY').length;
  const authorsBlocked = input.mass.authors.filter((author) => author.status === 'BLOCKED').length;
  const booksReady = input.mass.books.filter((book) => book.status === 'READY').length;
  const booksBlocked = input.mass.books.filter((book) => book.status === 'BLOCKED').length;
  const relationsReady = input.mass.relations.filter(
    (relation) => relation.status === 'READY',
  ).length;
  const relationsBlocked = input.mass.relations.filter(
    (relation) => relation.status === 'BLOCKED',
  ).length;
  const authorsUnblockedByMerge = authorReviews
    .filter((group) => group.proposal === 'MERGE_HIGH_CONFIDENCE')
    .reduce((total, group) => total + group.members.length, 0);
  const authorsStillManual = Math.max(0, authorsBlocked - authorsUnblockedByMerge);

  return {
    generatedAt,
    authorDuplicateReview: {
      summary: {
        duplicateGroups: authorReviews.length,
        affectedRecords: duplicateAffectedRecords,
        mergeHighConfidence: countByProposal(authorReviews, 'MERGE_HIGH_CONFIDENCE'),
        likelyMergeManualConfirmation: countByProposal(
          authorReviews,
          'LIKELY_MERGE_MANUAL_CONFIRMATION',
        ),
        keepSeparate: countByProposal(authorReviews, 'KEEP_SEPARATE'),
        manualReview: countByProposal(authorReviews, 'MANUAL_REVIEW'),
        expectedUniqueAuthorsAfterHighConfidence:
          input.mass.authors.length - highConfidenceMergedRecords,
        legacyPattern: summarizeLegacyPattern(authorReviews),
        conflictingAuthorPhotos: authorReviews.filter(
          (group) => group.photoClassification === 'MULTIPLE_CONFLICTING_IMAGES',
        ).length,
      },
      groups: authorReviews,
    },
    decisionsDraft: createDecisionsDraft(generatedAt, authorReviews),
    relationResolution,
    bookR,
    otherBookBlockers,
    postMergeSlugConflicts,
    simulation: {
      before: {
        authorsReady,
        authorsBlocked,
        relationsReady,
        relationsBlocked,
        booksBlocked,
      },
      afterHighConfidence: {
        uniqueAuthorsExpected: input.mass.authors.length - highConfidenceMergedRecords,
        authorsReady: authorsReady + authorsUnblockedByMerge,
        authorsStillManual,
        relationsReady: relationResolution.afterHighConfidence.ready,
        relationsStillBlocked: relationResolution.afterHighConfidence.stillBlocked,
        booksReady,
        remainingBlockers:
          authorsStillManual +
          relationResolution.afterHighConfidence.stillBlocked +
          booksBlocked +
          postMergeSlugConflicts.length,
      },
    },
  };
}

export async function writeMassResolutionOutputs(
  result: MassResolutionResult,
  outputDirectory: string,
): Promise<MassResolutionFiles> {
  await mkdir(outputDirectory, { recursive: true });
  const files: MassResolutionFiles = {
    duplicateReviewJson: path.join(outputDirectory, 'author-duplicate-review.json'),
    duplicateReviewHtml: path.join(outputDirectory, 'author-duplicate-review.html'),
    decisionsDraft: path.join(outputDirectory, 'mass-decisions-draft.json'),
    slugConflicts: path.join(outputDirectory, 'post-merge-slug-conflicts.json'),
    simulation: path.join(outputDirectory, 'mass-resolution-simulation.json'),
    blockersReviewHtml: path.join(outputDirectory, 'mass-blockers-review.html'),
  };

  await Promise.all([
    writeJson(files.duplicateReviewJson, result.authorDuplicateReview),
    writeFile(files.duplicateReviewHtml, renderAuthorDuplicateHtml(result), 'utf8'),
    writeJson(files.decisionsDraft, result.decisionsDraft),
    writeJson(files.slugConflicts, result.postMergeSlugConflicts),
    writeJson(files.simulation, {
      simulation: result.simulation,
      relationResolution: result.relationResolution,
      bookR: result.bookR,
      otherBookBlockers: result.otherBookBlockers,
    }),
    writeFile(files.blockersReviewHtml, renderBlockersHtml(result), 'utf8'),
  ]);

  return files;
}

function reviewAuthorDuplicates(input: MassResolutionInput): AuthorDuplicateReviewGroup[] {
  const auditAuthorsByKey = new Map(
    input.audit.authors.map((author) => [author.candidateKey, author]),
  );
  const booksByKey = new Map(input.mass.books.map((book) => [book.candidateKey, book]));
  const relationsByAuthor = groupBy(
    input.mass.relations,
    (relation) => relation.authorCandidateKey,
  );
  const authorImagesByKey = new Map(
    input.mass.authorImages.map((image) => [image.authorCandidateKey, image]),
  );
  const groups = groupBy(
    input.mass.authors.filter(
      (author) =>
        typeof author.sourceMetadata.possibleDuplicateGroup === 'string' &&
        author.sourceMetadata.possibleDuplicateGroup.length > 0,
    ),
    (author) => String(author.sourceMetadata.possibleDuplicateGroup),
  );

  return [...groups.entries()]
    .filter(([, authors]) => authors.length > 1)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, authors]) => {
      const members = authors.map((author) =>
        createDuplicateMember(
          author,
          auditAuthorsByKey.get(author.candidateKey),
          relationsByAuthor,
          booksByKey,
        ),
      );
      const photoSummary = classifyAuthorPhotos(authors, authorImagesByKey);
      const fieldConflicts = detectFieldConflicts(members, photoSummary.photoClassification);
      const proposal = classifyDuplicateGroup(
        members,
        fieldConflicts,
        photoSummary.photoClassification,
      );
      const canonicalCandidateKey =
        proposal === 'KEEP_SEPARATE'
          ? null
          : selectCanonicalAuthor(authors, auditAuthorsByKey, authorImagesByKey);
      const proposedAction =
        proposal === 'MERGE_HIGH_CONFIDENCE' || proposal === 'LIKELY_MERGE_MANUAL_CONFIRMATION'
          ? 'merge'
          : proposal === 'KEEP_SEPARATE'
            ? 'keep_separate'
            : 'manual_review';
      const reasons = createDuplicateReasons(
        members,
        proposal,
        fieldConflicts,
        photoSummary.photoClassification,
      );

      return {
        groupId,
        proposal,
        proposedAction,
        canonicalCandidateKey,
        mergeCandidates:
          canonicalCandidateKey === null
            ? []
            : authors
                .map((author) => author.candidateKey)
                .filter((candidateKey) => candidateKey !== canonicalCandidateKey),
        confidence: scoreDuplicateConfidence(
          proposal,
          fieldConflicts,
          photoSummary.photoClassification,
        ),
        reasons,
        fieldConflicts,
        photoClassification: photoSummary.photoClassification,
        canonicalPhoto: photoSummary.canonicalPhoto,
        proposedMergedData: createProposedMergedData(
          authors,
          canonicalCandidateKey,
          members,
          photoSummary,
        ),
        members,
      };
    });
}

function createDuplicateMember(
  author: MassAuthorPlan,
  auditAuthor: PilotAuthorCandidate | undefined,
  relationsByAuthor: Map<string, MassRelationPlan[]>,
  booksByKey: Map<string, MassBookPlan>,
): AuthorDuplicateMember {
  const relatedBooks = (relationsByAuthor.get(author.candidateKey) ?? []).map((relation) => ({
    bookCandidateKey: relation.bookCandidateKey,
    title: booksByKey.get(relation.bookCandidateKey)?.input.title ?? null,
  }));

  return {
    candidateKey: author.candidateKey,
    sourceWpPostId: author.sourceWpPostId,
    name: author.input.name,
    normalizedName: auditAuthor?.normalizedName || normalizeName(author.input.name),
    slug: author.input.slug,
    oldUrl: readString(author.sourceMetadata.oldUrl),
    classification: readString(author.sourceMetadata.classification),
    tfLibro:
      relatedBooks
        .map((book) => book.title)
        .filter(Boolean)
        .join(' | ') || null,
    createdAt: null,
    modifiedAt: null,
    biographyPreview: author.input.biography
      ? stripHtmlForPreview(author.input.biography, 180)
      : null,
    rawReviewPreview:
      stripHtmlForPreview(readString(author.sourceMetadata.rawReview) ?? '', 180) || null,
    thumbnailId: auditAuthor?.thumbnailId || null,
    thumbnailUrl: auditAuthor?.thumbnailUrl || null,
    imageFieldId: auditAuthor?.imageFieldId || null,
    imageFieldUrl: auditAuthor?.imageFieldUrl || null,
    relatedBooks,
    yoastMetaTitle: readString(author.sourceMetadata.yoastMetaTitle),
    yoastMetaDescription: readString(author.sourceMetadata.yoastMetaDescription),
  };
}

function classifyDuplicateGroup(
  members: AuthorDuplicateMember[],
  fieldConflicts: string[],
  photoClassification: AuthorDuplicateReviewGroup['photoClassification'],
): DuplicateProposal {
  const normalizedNames = uniqueValues(members.map((member) => member.normalizedName));
  const slugFamilies = uniqueValues(members.map((member) => normalizeSlugComparison(member.slug)));
  const sameName = normalizedNames.length === 1;
  const sameSlugFamily = slugFamilies.length === 1;
  const hasModernAuthor = members.some(
    (member) => member.classification === 'author_only_candidate',
  );
  const hasLegacyBookRows = members.some(
    (member) => member.classification === 'legacy_author_book_combined',
  );
  const hasStrongConflict = fieldConflicts.length > 0;

  if (!sameName && hasStrongConflict) {
    return 'KEEP_SEPARATE';
  }

  if (!sameName) {
    return 'MANUAL_REVIEW';
  }

  if (
    sameSlugFamily &&
    !hasStrongConflict &&
    photoClassification !== 'MULTIPLE_CONFLICTING_IMAGES'
  ) {
    return 'MERGE_HIGH_CONFIDENCE';
  }

  if ((sameSlugFamily || (hasModernAuthor && hasLegacyBookRows)) && hasStrongConflict) {
    return 'LIKELY_MERGE_MANUAL_CONFIRMATION';
  }

  if (sameName) {
    return 'LIKELY_MERGE_MANUAL_CONFIRMATION';
  }

  return 'MANUAL_REVIEW';
}

function selectCanonicalAuthor(
  authors: MassAuthorPlan[],
  auditAuthorsByKey: Map<string, PilotAuthorCandidate>,
  authorImagesByKey: Map<string, MassAuthorImagePlan>,
): string {
  const scored = authors.map((author) => {
    const auditAuthor = auditAuthorsByKey.get(author.candidateKey);
    const image = authorImagesByKey.get(author.candidateKey);
    const cleanSlugScore = /-\d+$/u.test(author.input.slug) ? 0 : 25;
    const modernScore = auditAuthor?.classification === 'author_only_candidate' ? 100 : 0;
    const biographyScore = (author.input.biography?.length ?? 0) > 0 ? 20 : 0;
    const imageScore = image?.status === 'AUTO_UPLOAD' ? 15 : image?.url ? 5 : 0;
    const completenessScore = Object.values(author.input).filter(
      (value) => value !== null && value !== '',
    ).length;
    const sourceOrderScore = 1 / Number(author.sourceWpPostId || '999999');

    return {
      candidateKey: author.candidateKey,
      score:
        modernScore +
        cleanSlugScore +
        biographyScore +
        imageScore +
        completenessScore +
        sourceOrderScore,
    };
  });

  scored.sort(
    (left, right) =>
      right.score - left.score || left.candidateKey.localeCompare(right.candidateKey),
  );

  return scored[0]?.candidateKey ?? authors[0]?.candidateKey ?? '';
}

function classifyAuthorPhotos(
  authors: MassAuthorPlan[],
  authorImagesByKey: Map<string, MassAuthorImagePlan>,
): {
  photoClassification: AuthorDuplicateReviewGroup['photoClassification'];
  canonicalPhoto: AuthorDuplicateReviewGroup['canonicalPhoto'];
} {
  const images = authors
    .map((author) => authorImagesByKey.get(author.candidateKey))
    .filter((image): image is MassAuthorImagePlan => Boolean(image?.attachmentId));
  const highImages = images.filter((image) => image.status === 'AUTO_UPLOAD');
  const uniqueHighAttachmentIds = uniqueValues(highImages.map((image) => image.attachmentId ?? ''));

  if (images.length === 0) {
    return { photoClassification: 'NO_IMAGE', canonicalPhoto: null };
  }

  if (uniqueHighAttachmentIds.length === 1) {
    const image = highImages[0];

    return {
      photoClassification: 'SAME_IMAGE',
      canonicalPhoto: image
        ? {
            authorCandidateKey: image.authorCandidateKey,
            attachmentId: image.attachmentId ?? '',
            url: image.url,
            confidence: image.confidence,
          }
        : null,
    };
  }

  if (highImages.length === 1) {
    const image = highImages[0];

    return {
      photoClassification: 'ONE_CLEAR_BEST_IMAGE',
      canonicalPhoto: {
        authorCandidateKey: image.authorCandidateKey,
        attachmentId: image.attachmentId ?? '',
        url: image.url,
        confidence: image.confidence,
      },
    };
  }

  if (
    highImages.length > 1 ||
    uniqueValues(images.map((image) => image.attachmentId ?? '')).length > 1
  ) {
    return {
      photoClassification: 'MULTIPLE_CONFLICTING_IMAGES',
      canonicalPhoto: null,
    };
  }

  const image = images[0];

  return {
    photoClassification: 'ONE_CLEAR_BEST_IMAGE',
    canonicalPhoto: image
      ? {
          authorCandidateKey: image.authorCandidateKey,
          attachmentId: image.attachmentId ?? '',
          url: image.url,
          confidence: image.confidence,
        }
      : null,
  };
}

function detectFieldConflicts(
  members: AuthorDuplicateMember[],
  photoClassification: AuthorDuplicateReviewGroup['photoClassification'],
): string[] {
  const conflicts: string[] = [];
  const authorBioValues = uniqueValues(
    members
      .filter((member) => member.classification === 'author_only_candidate')
      .map((member) => normalizeName(member.rawReviewPreview ?? ''))
      .filter(Boolean),
  );
  const names = uniqueValues(members.map((member) => member.normalizedName));

  if (names.length > 1) {
    conflicts.push('MANUAL_REVIEW_FIELD_CONFLICT:name');
  }

  if (authorBioValues.length > 1) {
    conflicts.push('MANUAL_REVIEW_FIELD_CONFLICT:biography');
  }

  if (photoClassification === 'MULTIPLE_CONFLICTING_IMAGES') {
    conflicts.push('MANUAL_REVIEW_FIELD_CONFLICT:photo');
  }

  return conflicts;
}

function createDuplicateReasons(
  members: AuthorDuplicateMember[],
  proposal: DuplicateProposal,
  fieldConflicts: string[],
  photoClassification: AuthorDuplicateReviewGroup['photoClassification'],
): string[] {
  const reasons: string[] = [];
  const normalizedNames = uniqueValues(members.map((member) => member.normalizedName));
  const slugFamilies = uniqueValues(members.map((member) => normalizeSlugComparison(member.slug)));
  const distinctBookTitles = uniqueValues(
    members.flatMap((member) => member.relatedBooks.map((book) => book.title ?? '')),
  );

  if (normalizedNames.length === 1) {
    reasons.push('Nombre normalizado identico en el grupo.');
  }

  if (slugFamilies.length === 1) {
    reasons.push('Slugs compatibles con familia historica y sufijos numericos.');
  }

  if (distinctBookTitles.length > 1) {
    reasons.push('Patron legacy: la misma persona aparece asociada a varios libros.');
  }

  if (photoClassification === 'MULTIPLE_CONFLICTING_IMAGES') {
    reasons.push('Existen varias fotos candidatas no equivalentes; requiere revision visual.');
  }

  if (fieldConflicts.length > 0) {
    reasons.push(`Conflictos de campo: ${fieldConflicts.join(', ')}.`);
  }

  reasons.push(`Propuesta calculada: ${proposal}.`);

  return reasons;
}

function scoreDuplicateConfidence(
  proposal: DuplicateProposal,
  fieldConflicts: string[],
  photoClassification: AuthorDuplicateReviewGroup['photoClassification'],
) {
  if (proposal === 'MERGE_HIGH_CONFIDENCE') {
    return 0.92;
  }

  if (proposal === 'LIKELY_MERGE_MANUAL_CONFIRMATION') {
    return photoClassification === 'MULTIPLE_CONFLICTING_IMAGES' || fieldConflicts.length > 0
      ? 0.74
      : 0.82;
  }

  if (proposal === 'KEEP_SEPARATE') {
    return 0.78;
  }

  return 0.5;
}

function createProposedMergedData(
  authors: MassAuthorPlan[],
  canonicalCandidateKey: string | null,
  members: AuthorDuplicateMember[],
  photoSummary: ReturnType<typeof classifyAuthorPhotos>,
): Record<string, unknown> {
  const canonical = canonicalCandidateKey
    ? authors.find((author) => author.candidateKey === canonicalCandidateKey)
    : null;

  return {
    name: canonical?.input.name ?? members[0]?.name ?? null,
    slug: canonical?.input.slug ?? members[0]?.slug ?? null,
    shortBio: firstNonEmpty(authors.map((author) => author.input.shortBio)),
    biography: firstNonEmpty(authors.map((author) => author.input.biography)),
    photo: photoSummary.canonicalPhoto,
    websiteUrl: firstNonEmpty(authors.map((author) => author.input.websiteUrl)),
    instagramUrl: firstNonEmpty(authors.map((author) => author.input.instagramUrl)),
    facebookUrl: firstNonEmpty(authors.map((author) => author.input.facebookUrl)),
    country: firstNonEmpty(authors.map((author) => author.input.country)),
    seoMetadata: {
      metaTitle: firstNonEmpty(members.map((member) => member.yoastMetaTitle)),
      metaDescription: firstNonEmpty(members.map((member) => member.yoastMetaDescription)),
    },
    rule: 'Propuesta read-only: nunca sobrescribir un valor bueno con null; conflictos no nulos requieren revision humana.',
  };
}

function createHighConfidenceCanonicalMap(groups: AuthorDuplicateReviewGroup[]) {
  const canonicalMap = new Map<string, string>();

  for (const group of groups) {
    if (group.proposal !== 'MERGE_HIGH_CONFIDENCE' || !group.canonicalCandidateKey) {
      continue;
    }

    for (const member of group.members) {
      canonicalMap.set(member.candidateKey, group.canonicalCandidateKey);
    }
  }

  return canonicalMap;
}

function simulateRelations(
  mass: MassJsonFiles,
  canonicalMap: Map<string, string>,
): RelationResolutionSummary {
  const causes: Record<string, number> = {};
  const readyRelationKeys = new Set<string>();
  const stillBlockedRelationKeys = new Set<string>();
  let duplicateBookAuthorRelations = 0;

  for (const relation of mass.relations) {
    if (relation.status === 'BLOCKED') {
      const cause = classifyBlockedRelation(relation, canonicalMap);
      causes[cause] = (causes[cause] ?? 0) + 1;
    }

    const resolvedAuthorKey =
      canonicalMap.get(relation.authorCandidateKey) ?? relation.authorCandidateKey;
    const book = mass.books.find(
      (candidate) => candidate.candidateKey === relation.bookCandidateKey,
    );
    const canResolve =
      relation.status === 'READY' ||
      (canonicalMap.has(relation.authorCandidateKey) &&
        book?.status === 'READY' &&
        relation.confidence === 'high');
    const relationKey = `${relation.bookCandidateKey}::${resolvedAuthorKey}`;

    if (!canResolve) {
      stillBlockedRelationKeys.add(relationKey);
      continue;
    }

    if (readyRelationKeys.has(relationKey)) {
      duplicateBookAuthorRelations += 1;
      continue;
    }

    readyRelationKeys.add(relationKey);
  }

  const authorsByBook = new Map<string, Set<string>>();

  for (const relationKey of readyRelationKeys) {
    const [bookCandidateKey, authorCandidateKey] = relationKey.split('::');

    if (!bookCandidateKey || !authorCandidateKey) {
      continue;
    }

    const authors = authorsByBook.get(bookCandidateKey) ?? new Set<string>();
    authors.add(authorCandidateKey);
    authorsByBook.set(bookCandidateKey, authors);
  }

  const readyBooks = mass.books.filter((book) => book.status === 'READY');
  const booksWithZeroAuthors = readyBooks
    .filter((book) => (authorsByBook.get(book.candidateKey)?.size ?? 0) === 0)
    .map((book) => book.candidateKey);
  const multiAuthorBooks = [...authorsByBook.entries()]
    .filter(([, authors]) => authors.size > 1)
    .map(([bookCandidateKey, authors]) => ({ bookCandidateKey, authors: [...authors].sort() }));

  return {
    before: {
      ready: mass.relations.filter((relation) => relation.status === 'READY').length,
      blocked: mass.relations.filter((relation) => relation.status === 'BLOCKED').length,
      manual: mass.relations.filter((relation) => relation.status === 'MANUAL_REVIEW').length,
    },
    causes,
    afterHighConfidence: {
      ready: readyRelationKeys.size,
      stillBlocked: stillBlockedRelationKeys.size,
      duplicateBookAuthorRelations,
      booksWithZeroAuthors,
      multiAuthorBooks,
    },
  };
}

function classifyBlockedRelation(relation: MassRelationPlan, canonicalMap: Map<string, string>) {
  if (relation.blockingReasons.some((reason) => reason.includes('Autor relacionado'))) {
    return canonicalMap.has(relation.authorCandidateKey)
      ? 'BLOCKED_BY_AUTHOR_DUPLICATE_RESOLVABLE'
      : 'BLOCKED_BY_AUTHOR_DUPLICATE';
  }

  if (relation.blockingReasons.some((reason) => reason.includes('Libro relacionado'))) {
    return 'INVALID_BOOK_REFERENCE';
  }

  if (relation.confidence !== 'high') {
    return 'LOW_CONFIDENCE';
  }

  return 'OTHER';
}

function findPostMergeSlugConflicts(
  authors: MassAuthorPlan[],
  groups: AuthorDuplicateReviewGroup[],
): Array<{ slug: string; candidateKeys: string[] }> {
  const mergedCandidates = new Set(
    groups
      .filter((group) => group.proposal === 'MERGE_HIGH_CONFIDENCE')
      .flatMap((group) => group.mergeCandidates),
  );
  const slugMap = groupBy(
    authors.filter((author) => !mergedCandidates.has(author.candidateKey)),
    (author) => author.input.slug,
  );

  return [...slugMap.entries()]
    .filter(([, values]) => values.length > 1)
    .map(([slug, values]) => ({
      slug,
      candidateKeys: values.map((author) => author.candidateKey),
    }));
}

function analyzeBookR(input: MassResolutionInput): BookRAnalysis {
  const book = input.mass.books.find((candidate) => candidate.candidateKey === 'book:r');
  const auditBook =
    input.audit.books.find((candidate) => candidate.candidateKey === 'book:r') ??
    input.audit.books.find((candidate) => candidate.sourceWpPostId === book?.sourceWpPostId);

  if (!book && !auditBook) {
    return {
      status: 'NOT_FOUND',
      sourceWpPostId: null,
      titleRaw: null,
      tfLibroRaw: null,
      normalizedTitle: null,
      author: null,
      rawReviewPreview: null,
      slug: null,
      attachments: [],
      oldUrl: null,
      hiddenCharacterEvidence: [],
      reasons: ['No existe book:r en el mass plan ni en auditoria.'],
    };
  }

  const sourceWpPostId = book?.sourceWpPostId ?? auditBook?.sourceWpPostId ?? null;
  const attachments = resolveBookAttachments(auditBook, input.audit.attachments);
  const title = book?.input.title ?? auditBook?.title ?? null;
  const hiddenCharacterEvidence = title ? inspectHiddenCharacters(title) : [];
  const status = title && normalizeName(title).length > 1 ? 'RECOVERABLE' : 'MANUAL_REVIEW';
  const reasons = [
    'El libro queda bloqueado porque el titulo normalizado genera slug demasiado corto para createBookSchema.',
  ];

  if (title === 'R') {
    reasons.push('tf_libro contiene un unico caracter visible: requiere decision editorial.');
  }

  return {
    status,
    sourceWpPostId,
    titleRaw: title,
    tfLibroRaw: auditBook?.title ?? title,
    normalizedTitle: auditBook?.normalizedTitle ?? (title ? normalizeName(title) : null),
    author: auditBook?.sourceAuthorTitle ?? null,
    rawReviewPreview:
      stripHtmlForPreview(book?.input.description ?? auditBook?.rawReview ?? '', 260) || null,
    slug: book?.input.slug ?? null,
    attachments,
    oldUrl: readString(book?.sourceMetadata.oldUrl) ?? auditBook?.sourceOldUrl ?? null,
    hiddenCharacterEvidence,
    reasons,
  };
}

function resolveBookAttachments(
  book: PilotBookCandidate | undefined,
  attachments: PilotAttachmentCandidate[],
) {
  if (!book) {
    return [];
  }

  const attachmentById = new Map(
    attachments.map((attachment) => [attachment.wpPostId, attachment]),
  );
  const result: Array<{ attachmentId: string; url: string | null; reason: string }> = [];

  if (book.thumbnailId) {
    const attachment = attachmentById.get(book.thumbnailId);
    result.push({
      attachmentId: book.thumbnailId,
      url: attachment?.url ?? book.thumbnailUrl ?? null,
      reason: 'thumbnailId en books-candidates.csv',
    });
  }

  return result;
}

function createDecisionsDraft(
  generatedAt: string,
  groups: AuthorDuplicateReviewGroup[],
): MassResolutionResult['decisionsDraft'] {
  return {
    generatedAt,
    note: 'PROPUESTAS read-only. No copiar a decisiones finales sin revision humana.',
    authorDuplicateGroups: Object.fromEntries(
      groups.map((group) => [
        group.groupId,
        {
          proposedAction: group.proposedAction,
          canonicalCandidateKey: group.canonicalCandidateKey,
          mergeCandidates: group.mergeCandidates,
          confidence: group.confidence,
          reasons: group.reasons,
        },
      ]),
    ),
  };
}

function summarizeLegacyPattern(groups: AuthorDuplicateReviewGroup[]) {
  const groupsWithMultipleLegacyBookRows = groups.filter(
    (group) =>
      group.members.filter((member) => member.classification === 'legacy_author_book_combined')
        .length > 1,
  ).length;
  const distinctBooksAcrossDuplicateGroups = uniqueValues(
    groups.flatMap((group) =>
      group.members.flatMap((member) => member.relatedBooks.map((book) => book.title ?? '')),
    ),
  ).length;

  return {
    groupsWithMultipleLegacyBookRows,
    distinctBooksAcrossDuplicateGroups,
  };
}

function countByProposal(groups: AuthorDuplicateReviewGroup[], proposal: DuplicateProposal) {
  return groups.filter((group) => group.proposal === proposal).length;
}

function inspectHiddenCharacters(value: string) {
  const result: string[] = [];

  for (const character of value) {
    const code = character.codePointAt(0);

    if (code && (code < 32 || code === 160 || code === 8203)) {
      result.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')}`);
    }
  }

  return result;
}

function groupBy<TValue>(
  values: TValue[],
  getKey: (value: TValue) => string,
): Map<string, TValue[]> {
  const groups = new Map<string, TValue[]>();

  for (const value of values) {
    const key = getKey(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }

  return groups;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? null;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function renderAuthorDuplicateHtml(result: MassResolutionResult) {
  const groups = result.authorDuplicateReview.groups
    .map(
      (group) => `<section class="group">
  <h2>${escapeHtml(group.groupId)}</h2>
  <p><strong>Propuesta:</strong> ${group.proposal} · <strong>Canonical:</strong> ${escapeHtml(group.canonicalCandidateKey ?? 'n/a')} · <strong>Fotos:</strong> ${group.photoClassification}</p>
  <p>${group.reasons.map(escapeHtml).join('<br>')}</p>
  <div class="cards">${group.members.map(renderDuplicateMember).join('')}</div>
</section>`,
    )
    .join('\n');

  return renderHtmlPage('Author Duplicate Review', `<h1>Author Duplicate Review</h1>${groups}`);
}

function renderDuplicateMember(member: AuthorDuplicateMember) {
  const image = member.thumbnailUrl
    ? `<img src="${escapeHtml(member.thumbnailUrl)}" alt="Imagen ${escapeHtml(member.name)}">`
    : '<div class="placeholder">Sin imagen</div>';

  return `<article class="card">
  ${image}
  <h3>${escapeHtml(member.name)}</h3>
  <p><strong>Key:</strong> ${escapeHtml(member.candidateKey)} · <strong>WP:</strong> ${escapeHtml(member.sourceWpPostId)}</p>
  <p><strong>Slug:</strong> ${escapeHtml(member.slug)}</p>
  <p><strong>Clasificación:</strong> ${escapeHtml(member.classification ?? 'n/a')}</p>
  <p><strong>Libros:</strong> ${escapeHtml(member.tfLibro ?? 'n/a')}</p>
  <p><strong>Bio/raw:</strong> ${escapeHtml(member.biographyPreview ?? member.rawReviewPreview ?? 'n/a')}</p>
  <p><strong>Old URL:</strong> ${escapeHtml(member.oldUrl ?? 'n/a')}</p>
</article>`;
}

function renderBlockersHtml(result: MassResolutionResult) {
  const summary = result.authorDuplicateReview.summary;
  const body = `<h1>Mass Blockers Review</h1>
<section>
  <h2>Resumen general</h2>
  <ul>
    <li>Duplicate groups: ${summary.duplicateGroups}</li>
    <li>Registros afectados: ${summary.affectedRecords}</li>
    <li>MERGE_HIGH_CONFIDENCE: ${summary.mergeHighConfidence}</li>
    <li>LIKELY_MERGE_MANUAL_CONFIRMATION: ${summary.likelyMergeManualConfirmation}</li>
    <li>KEEP_SEPARATE: ${summary.keepSeparate}</li>
    <li>MANUAL_REVIEW: ${summary.manualReview}</li>
  </ul>
</section>
<section>
  <h2>Relaciones bloqueadas</h2>
  <pre>${escapeHtml(JSON.stringify(result.relationResolution, null, 2))}</pre>
</section>
<section>
  <h2>book:r</h2>
  <pre>${escapeHtml(JSON.stringify(result.bookR, null, 2))}</pre>
</section>
<section>
  <h2>Slug conflicts</h2>
  <pre>${escapeHtml(JSON.stringify(result.postMergeSlugConflicts, null, 2))}</pre>
</section>
<section>
  <h2>Simulation results</h2>
  <pre>${escapeHtml(JSON.stringify(result.simulation, null, 2))}</pre>
</section>`;

  return renderHtmlPage('Mass Blockers Review', body);
}

function renderHtmlPage(title: string, body: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; background: #f7f7f5; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .group { margin: 0 0 32px; padding: 20px; background: white; border: 1px solid #ddd; border-radius: 8px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .card { padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    img, .placeholder { width: 96px; height: 96px; object-fit: cover; border-radius: 6px; background: #eee; display: grid; place-items: center; font-size: 12px; color: #666; }
    pre { overflow: auto; background: #111; color: #f5f5f5; padding: 16px; border-radius: 8px; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
