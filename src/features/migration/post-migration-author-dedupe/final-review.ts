import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AuthorDedupeAudit,
  AuthorDedupeDecision,
  AuthorDedupeDecisionRecord,
  AuthorDedupeFinalReview,
  AuthorDedupeSelectedFields,
  AuthorDuplicateGroup,
} from './types';

export async function createAuthorDedupeFinalReview(params: {
  outputDirectory: string;
  generatedAt?: string;
}): Promise<{ audit: AuthorDedupeAudit; review: AuthorDedupeFinalReview }> {
  const outputDirectory = path.resolve(params.outputDirectory);
  const audit = await readJson<AuthorDedupeAudit>(
    path.join(outputDirectory, 'author-duplicate-audit.json'),
  );
  const generatedAt = params.generatedAt ?? new Date().toISOString();
  const decisions = audit.groups.map(createInitialAuthorDedupeDecision);

  return {
    audit,
    review: serializeAuthorDedupeDecisions(decisions, generatedAt),
  };
}

export function createInitialAuthorDedupeDecision(
  group: AuthorDuplicateGroup,
): AuthorDedupeDecisionRecord {
  return {
    groupId: group.groupId,
    classification: group.classification,
    decision: null,
    canonicalAuthorId: group.canonicalAuthorId,
    mergeAuthorIds: group.authors
      .map((author) => author.id)
      .filter((authorId) => authorId !== group.canonicalAuthorId),
    selectedFields: buildSelectedFields(group),
    fieldConflicts: group.conflicts,
    notes: '',
    reviewed: false,
    updatedAt: null,
  };
}

export function applyAuthorDedupeDecision(
  record: AuthorDedupeDecisionRecord,
  decision: AuthorDedupeDecision,
): AuthorDedupeDecisionRecord {
  return {
    ...record,
    decision,
    reviewed: decision !== null ? record.reviewed : false,
  };
}

export function selectCanonicalAuthorForDecision(
  group: AuthorDuplicateGroup,
  record: AuthorDedupeDecisionRecord,
  canonicalAuthorId: string,
): AuthorDedupeDecisionRecord {
  const canonical = group.authors.find((author) => author.id === canonicalAuthorId);

  if (!canonical) {
    return record;
  }

  return {
    ...record,
    canonicalAuthorId,
    mergeAuthorIds: group.authors
      .map((author) => author.id)
      .filter((authorId) => authorId !== canonicalAuthorId),
  };
}

export function selectPhotoForDecision(
  record: AuthorDedupeDecisionRecord,
  photoUrl: string | null,
): AuthorDedupeDecisionRecord {
  return {
    ...record,
    selectedFields: {
      ...record.selectedFields,
      photoUrl,
    },
  };
}

export function selectBiographyForDecision(
  record: AuthorDedupeDecisionRecord,
  biography: string | null,
): AuthorDedupeDecisionRecord {
  return {
    ...record,
    selectedFields: {
      ...record.selectedFields,
      biography,
    },
  };
}

export function serializeAuthorDedupeDecisions(
  decisions: AuthorDedupeDecisionRecord[],
  generatedAt: string,
): AuthorDedupeFinalReview {
  return {
    schemaVersion: 1,
    generatedAt,
    decisions,
    statistics: createDecisionStatistics(decisions),
  };
}

export function restoreAuthorDedupeDecisions(
  audit: AuthorDedupeAudit,
  imported: unknown,
): AuthorDedupeDecisionRecord[] {
  const groupsById = new Map(audit.groups.map((group) => [group.groupId, group]));
  const initialById = new Map(
    audit.groups.map((group) => [group.groupId, createInitialAuthorDedupeDecision(group)]),
  );
  const importedRecords = parseImportedRecords(imported);

  return audit.groups.map((group) => {
    const importedRecord = importedRecords.find((record) => record.groupId === group.groupId);
    const initialRecord = initialById.get(group.groupId);

    if (!importedRecord || !initialRecord) {
      return createInitialAuthorDedupeDecision(group);
    }

    const currentGroup = groupsById.get(group.groupId);
    const validCanonicalId = currentGroup?.authors.some(
      (author) => author.id === importedRecord.canonicalAuthorId,
    )
      ? importedRecord.canonicalAuthorId
      : initialRecord.canonicalAuthorId;

    return {
      ...initialRecord,
      decision: isDecision(importedRecord.decision) ? importedRecord.decision : null,
      canonicalAuthorId: validCanonicalId,
      mergeAuthorIds:
        currentGroup?.authors
          .map((author) => author.id)
          .filter((authorId) => authorId !== validCanonicalId) ?? initialRecord.mergeAuthorIds,
      selectedFields: restoreSelectedFields(group, importedRecord.selectedFields),
      notes: typeof importedRecord.notes === 'string' ? importedRecord.notes : '',
      reviewed: Boolean(importedRecord.reviewed),
      updatedAt: typeof importedRecord.updatedAt === 'string' ? importedRecord.updatedAt : null,
    };
  });
}

function buildSelectedFields(group: AuthorDuplicateGroup): AuthorDedupeSelectedFields {
  const valueByField = new Map(
    group.fieldProposals.map((field) => [field.field, field.proposedValue]),
  );

  return {
    name: String(valueByField.get('name') ?? ''),
    slug: String(valueByField.get('slug') ?? ''),
    photoUrl: nullableString(valueByField.get('photoUrl')),
    biography: nullableString(valueByField.get('biography')),
    country: nullableString(valueByField.get('country')),
    websiteUrl: nullableString(valueByField.get('websiteUrl')),
    instagramUrl: nullableString(valueByField.get('instagramUrl')),
    facebookUrl: nullableString(valueByField.get('facebookUrl')),
    isPublished: Boolean(valueByField.get('isPublished')),
    isFeatured: Boolean(valueByField.get('isFeatured')),
    sortOrder: Number(valueByField.get('sortOrder') ?? 0),
  };
}

function restoreSelectedFields(
  group: AuthorDuplicateGroup,
  selectedFields: unknown,
): AuthorDedupeSelectedFields {
  const initialFields = buildSelectedFields(group);

  if (typeof selectedFields !== 'object' || selectedFields === null) {
    return initialFields;
  }

  const fields = selectedFields as Partial<AuthorDedupeSelectedFields>;
  const allowedPhotoUrls = new Set(group.authors.map((author) => author.photoUrl).filter(Boolean));
  const allowedBiographies = new Set(
    group.authors.map((author) => author.biography).filter(Boolean),
  );

  return {
    ...initialFields,
    photoUrl:
      fields.photoUrl === null ||
      (typeof fields.photoUrl === 'string' && allowedPhotoUrls.has(fields.photoUrl))
        ? fields.photoUrl
        : initialFields.photoUrl,
    biography:
      fields.biography === null ||
      (typeof fields.biography === 'string' && allowedBiographies.has(fields.biography))
        ? fields.biography
        : initialFields.biography,
  };
}

function createDecisionStatistics(decisions: AuthorDedupeDecisionRecord[]) {
  const totalGroups = decisions.length;
  const merge = decisions.filter((decision) => decision.decision === 'merge').length;
  const keepSeparate = decisions.filter((decision) => decision.decision === 'keep_separate').length;
  const manualReview = decisions.filter((decision) => decision.decision === 'manual_review').length;
  const reviewed = decisions.filter((decision) => decision.reviewed).length;

  return {
    totalGroups,
    proposalOnly: decisions.filter((decision) => decision.decision === null).length,
    merge,
    keepSeparate,
    manualReview,
    reviewed,
    pendingReview: totalGroups - reviewed,
    highConfidence: decisions.filter(
      (decision) => decision.classification === 'HIGH_CONFIDENCE_DUPLICATE',
    ).length,
    likelyDuplicate: decisions.filter((decision) => decision.classification === 'LIKELY_DUPLICATE')
      .length,
    originalManualReview: decisions.filter(
      (decision) => decision.classification === 'MANUAL_REVIEW',
    ).length,
    photoConflicts: decisions.filter((decision) => decision.fieldConflicts.includes('photoUrl'))
      .length,
    biographyConflicts: decisions.filter((decision) =>
      decision.fieldConflicts.includes('biography'),
    ).length,
  };
}

function parseImportedRecords(imported: unknown) {
  if (typeof imported !== 'object' || imported === null || !('decisions' in imported)) {
    return [];
  }

  const decisions = (imported as { decisions?: unknown }).decisions;

  return Array.isArray(decisions) ? decisions : [];
}

function isDecision(value: unknown): value is AuthorDedupeDecision {
  return (
    value === null || value === 'merge' || value === 'keep_separate' || value === 'manual_review'
  );
}

function nullableString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}
