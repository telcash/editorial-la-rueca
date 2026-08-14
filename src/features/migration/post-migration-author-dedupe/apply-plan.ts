import { createHash } from 'node:crypto';
import path from 'node:path';

import type {
  AuthorDedupeApplyConflict,
  AuthorDedupeApplyGroupPlan,
  AuthorDedupeApplyManifestEntry,
  AuthorDedupeApplyMode,
  AuthorDedupeApplyPlan,
  AuthorDedupeApplyResult,
  AuthorDedupeAuthorSnapshot,
  AuthorDedupeRelationSnapshot,
  AuthorDedupeRollbackGroup,
} from './apply-types';
import type {
  AuthorDedupeDecisionRecord,
  AuthorDedupeFinalReview,
  AuthorDedupeSelectedFields,
} from './types';

const SELECTED_FIELD_NAMES = [
  'name',
  'slug',
  'photoUrl',
  'biography',
  'country',
  'websiteUrl',
  'instagramUrl',
  'facebookUrl',
  'isPublished',
  'isFeatured',
  'sortOrder',
] as const satisfies ReadonlyArray<keyof AuthorDedupeSelectedFields>;

export interface CreateAuthorDedupeApplyPlanOptions {
  decisionsFile: string;
  review: AuthorDedupeFinalReview;
  authors: AuthorDedupeAuthorSnapshot[];
  relations: AuthorDedupeRelationSnapshot[];
  mode: AuthorDedupeApplyMode;
  batchSize: number;
  generatedAt?: string;
}

export function createAuthorDedupeApplyPlan(
  options: CreateAuthorDedupeApplyPlanOptions,
): AuthorDedupeApplyPlan {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const approvedDecisions = options.review.decisions.filter(
    (decision) => decision.decision === 'merge',
  );
  const skippedDecisionGroups = options.review.decisions.length - approvedDecisions.length;
  const authorsById = new Map(options.authors.map((author) => [author.id, author]));
  const relationsByAuthorId = groupRelationsByAuthorId(options.relations);
  const structuralConflicts = validateDecisionSet(options.review.decisions);
  const groups = approvedDecisions.map((decision) =>
    createGroupPlan(decision, authorsById, relationsByAuthorId, structuralConflicts),
  );
  const conflicts = [...structuralConflicts, ...groups.flatMap((group) => group.conflicts)];
  const planFingerprint = createAuthorDedupePlanFingerprint(options.review);
  const manifestEntries = groups.map((group) =>
    createManifestEntry(group, generatedAt, options.mode === 'apply' ? 'planned' : 'planned'),
  );
  const rollbackGroups = groups.map(createRollbackGroup);
  const result = createInitialResult(generatedAt, groups.length);

  return {
    generatedAt,
    mode: options.mode,
    planFingerprint,
    decisionsFile: path.resolve(options.decisionsFile),
    batchSize: options.batchSize,
    groups,
    conflicts,
    manifest: {
      generatedAt,
      mode: options.mode,
      planFingerprint,
      currentBatchIndex: 0,
      completedBatches: [],
      entries: manifestEntries,
    },
    rollbackPlan: {
      generatedAt,
      planFingerprint,
      groups: rollbackGroups,
      notes: [
        'Rollback seguro recomendado: restaurar autores duplicados, restaurar relaciones originales, eliminar relaciones creadas hacia el canonico y finalmente restaurar los campos previos del canonico.',
        'Este proceso no borra imagenes de Storage; photoUrl se restaura como campo de base de datos.',
      ],
    },
    result,
    summary: {
      approvedGroups: approvedDecisions.length,
      skippedDecisionGroups,
      canonicalAuthors: new Set(approvedDecisions.map((decision) => decision.canonicalAuthorId))
        .size,
      duplicateAuthorsToArchive: new Set(
        approvedDecisions.flatMap((decision) => decision.mergeAuthorIds),
      ).size,
      relationsToMove: groups.reduce((total, group) => total + group.relationsToMove.length, 0),
      duplicateRelationsToAvoid: groups.reduce(
        (total, group) => total + group.relationsSkippedAsDuplicate.length,
        0,
      ),
      conflicts: conflicts.length,
      blockers: conflicts.filter((conflict) => conflict.severity === 'error').length,
    },
  };
}

export function createAuthorDedupePlanFingerprint(review: AuthorDedupeFinalReview) {
  const payload = review.decisions
    .filter((decision) => decision.decision === 'merge')
    .map((decision) => ({
      groupId: decision.groupId,
      canonicalAuthorId: decision.canonicalAuthorId,
      mergeAuthorIds: [...decision.mergeAuthorIds].sort(),
      selectedFields: normalizeSelectedFieldsForFingerprint(decision.selectedFields),
    }))
    .sort((left, right) => left.groupId.localeCompare(right.groupId));

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function createGroupPlan(
  decision: AuthorDedupeDecisionRecord,
  authorsById: Map<string, AuthorDedupeAuthorSnapshot>,
  relationsByAuthorId: Map<string, AuthorDedupeRelationSnapshot[]>,
  structuralConflicts: AuthorDedupeApplyConflict[],
): AuthorDedupeApplyGroupPlan {
  const canonicalAuthor = authorsById.get(decision.canonicalAuthorId) ?? null;
  const duplicates = decision.mergeAuthorIds
    .map((authorId) => authorsById.get(authorId) ?? null)
    .filter((author): author is AuthorDedupeAuthorSnapshot => author !== null);
  const missingDuplicateAuthorIds = decision.mergeAuthorIds.filter(
    (authorId) => !authorsById.has(authorId),
  );
  const canonicalRelations = relationsByAuthorId.get(decision.canonicalAuthorId) ?? [];
  const duplicateRelations = decision.mergeAuthorIds.flatMap(
    (authorId) => relationsByAuthorId.get(authorId) ?? [],
  );
  const relationPlan = createRelationPlan(decision, canonicalRelations, duplicateRelations);
  const conflicts = createGroupConflicts({
    decision,
    canonicalAuthor,
    missingDuplicateAuthorIds,
    duplicates,
    structuralConflicts,
  });

  return {
    groupId: decision.groupId,
    decision,
    canonicalAuthor,
    duplicates,
    missingDuplicateAuthorIds,
    selectedFields: pickSelectedFields(decision.selectedFields),
    currentRelations: [...canonicalRelations, ...duplicateRelations],
    finalRelations: relationPlan.finalRelations,
    relationsToMove: relationPlan.relationsToMove,
    relationsSkippedAsDuplicate: relationPlan.relationsSkippedAsDuplicate,
    authorsToArchive: decision.mergeAuthorIds,
    conflicts,
  };
}

function createRelationPlan(
  decision: AuthorDedupeDecisionRecord,
  canonicalRelations: AuthorDedupeRelationSnapshot[],
  duplicateRelations: AuthorDedupeRelationSnapshot[],
) {
  const finalRelationMap = new Map<
    string,
    {
      bookId: string;
      title: string;
      authorId: string;
      sourceAuthorIds: string[];
      sortOrder: number;
    }
  >();
  const canonicalBookIds = new Set<string>();
  const relationsToMove = [];
  const relationsSkippedAsDuplicate = [];

  for (const relation of canonicalRelations) {
    canonicalBookIds.add(relation.bookId);
    finalRelationMap.set(relation.bookId, {
      bookId: relation.bookId,
      title: relation.bookTitle,
      authorId: decision.canonicalAuthorId,
      sourceAuthorIds: [decision.canonicalAuthorId],
      sortOrder: relation.sortOrder,
    });
  }

  for (const relation of duplicateRelations) {
    const finalRelation = finalRelationMap.get(relation.bookId);

    if (canonicalBookIds.has(relation.bookId)) {
      relationsSkippedAsDuplicate.push({
        bookId: relation.bookId,
        title: relation.bookTitle,
        fromAuthorId: relation.authorId,
        existingAuthorId: decision.canonicalAuthorId,
        reason: 'canonical_relation_exists' as const,
      });
      finalRelation?.sourceAuthorIds.push(relation.authorId);
      continue;
    }

    if (finalRelation) {
      relationsSkippedAsDuplicate.push({
        bookId: relation.bookId,
        title: relation.bookTitle,
        fromAuthorId: relation.authorId,
        existingAuthorId: decision.canonicalAuthorId,
        reason: 'already_moved_by_duplicate' as const,
      });
      finalRelation.sourceAuthorIds.push(relation.authorId);
      continue;
    }

    relationsToMove.push({
      bookId: relation.bookId,
      title: relation.bookTitle,
      fromAuthorId: relation.authorId,
      toAuthorId: decision.canonicalAuthorId,
      sortOrder: relation.sortOrder,
    });
    finalRelationMap.set(relation.bookId, {
      bookId: relation.bookId,
      title: relation.bookTitle,
      authorId: decision.canonicalAuthorId,
      sourceAuthorIds: [relation.authorId],
      sortOrder: relation.sortOrder,
    });
  }

  return {
    finalRelations: [...finalRelationMap.values()],
    relationsToMove,
    relationsSkippedAsDuplicate,
  };
}

function validateDecisionSet(decisions: AuthorDedupeDecisionRecord[]): AuthorDedupeApplyConflict[] {
  const conflicts: AuthorDedupeApplyConflict[] = [];
  const duplicateOwnerById = new Map<string, string>();
  const canonicalGroupById = new Map<string, string>();

  for (const decision of decisions) {
    if (decision.decision !== 'merge') {
      conflicts.push({
        code: 'INVALID_DECISION',
        severity: 'warning',
        groupId: decision.groupId,
        authorId: null,
        message: 'Grupo omitido porque no esta aprobado como merge.',
        details: `decision=${String(decision.decision)}`,
      });
      continue;
    }

    if (!decision.canonicalAuthorId || decision.mergeAuthorIds.length === 0) {
      conflicts.push({
        code: 'INCOMPLETE_DECISION',
        severity: 'error',
        groupId: decision.groupId,
        authorId: decision.canonicalAuthorId || null,
        message: 'Decision de merge incompleta.',
        details: 'canonicalAuthorId y mergeAuthorIds son obligatorios.',
      });
    }

    canonicalGroupById.set(decision.canonicalAuthorId, decision.groupId);

    for (const duplicateAuthorId of decision.mergeAuthorIds) {
      const previousGroupId = duplicateOwnerById.get(duplicateAuthorId);

      if (previousGroupId && previousGroupId !== decision.groupId) {
        conflicts.push({
          code: 'OVERLAPPING_DUPLICATE',
          severity: 'error',
          groupId: decision.groupId,
          authorId: duplicateAuthorId,
          message: 'Un autor duplicado aparece en mas de un grupo.',
          details: `Tambien aparece en ${previousGroupId}.`,
        });
      }

      duplicateOwnerById.set(duplicateAuthorId, decision.groupId);
    }
  }

  for (const [duplicateAuthorId, duplicateGroupId] of duplicateOwnerById) {
    const canonicalGroupId = canonicalGroupById.get(duplicateAuthorId);

    if (canonicalGroupId && canonicalGroupId !== duplicateGroupId) {
      conflicts.push({
        code: 'CANONICAL_USED_AS_DUPLICATE',
        severity: 'error',
        groupId: duplicateGroupId,
        authorId: duplicateAuthorId,
        message: 'Un autor marcado como duplicado tambien es canonico de otro grupo.',
        details: `Canonico en ${canonicalGroupId}.`,
      });
    }
  }

  return conflicts;
}

function createGroupConflicts(input: {
  decision: AuthorDedupeDecisionRecord;
  canonicalAuthor: AuthorDedupeAuthorSnapshot | null;
  missingDuplicateAuthorIds: string[];
  duplicates: AuthorDedupeAuthorSnapshot[];
  structuralConflicts: AuthorDedupeApplyConflict[];
}) {
  const conflicts: AuthorDedupeApplyConflict[] = [];
  const structuralGroupHasError = input.structuralConflicts.some(
    (conflict) => conflict.groupId === input.decision.groupId && conflict.severity === 'error',
  );

  if (!input.canonicalAuthor) {
    conflicts.push({
      code: 'CANONICAL_MISSING',
      severity: 'error',
      groupId: input.decision.groupId,
      authorId: input.decision.canonicalAuthorId,
      message: 'El autor canonico no existe en PostgreSQL.',
      details: input.decision.canonicalAuthorId,
    });
  } else if (input.canonicalAuthor.isArchived) {
    conflicts.push({
      code: 'CANONICAL_ARCHIVED',
      severity: 'error',
      groupId: input.decision.groupId,
      authorId: input.canonicalAuthor.id,
      message: 'El autor canonico ya esta archivado.',
      details: input.canonicalAuthor.slug,
    });
  }

  for (const duplicateAuthorId of input.missingDuplicateAuthorIds) {
    conflicts.push({
      code: 'DUPLICATE_MISSING',
      severity: 'error',
      groupId: input.decision.groupId,
      authorId: duplicateAuthorId,
      message: 'Un autor duplicado no existe en PostgreSQL.',
      details: duplicateAuthorId,
    });
  }

  for (const duplicate of input.duplicates) {
    if (!duplicate.isArchived) {
      continue;
    }

    conflicts.push({
      code: 'DUPLICATE_ALREADY_ARCHIVED',
      severity: 'warning',
      groupId: input.decision.groupId,
      authorId: duplicate.id,
      message: 'El autor duplicado ya esta archivado.',
      details: duplicate.slug,
    });
  }

  if (!structuralGroupHasError && input.canonicalAuthor) {
    const selectedSlug = input.decision.selectedFields.slug;

    if (selectedSlug && selectedSlug !== input.canonicalAuthor.slug) {
      const matchingDuplicate = input.duplicates.find(
        (duplicate) => duplicate.slug === selectedSlug,
      );

      if (!matchingDuplicate) {
        conflicts.push({
          code: 'SLUG_COLLISION',
          severity: 'warning',
          groupId: input.decision.groupId,
          authorId: input.canonicalAuthor.id,
          message: 'El slug seleccionado no coincide con el canonico ni con duplicados del grupo.',
          details: selectedSlug,
        });
      }
    }
  }

  return conflicts;
}

function createRollbackGroup(group: AuthorDedupeApplyGroupPlan): AuthorDedupeRollbackGroup {
  return {
    groupId: group.groupId,
    rollbackOrder: [
      'restore_duplicate_authors',
      'restore_original_relations',
      'delete_created_canonical_relations',
      'restore_canonical_author',
    ],
    canonicalBefore: group.canonicalAuthor,
    duplicatesBefore: group.duplicates,
    originalRelations: group.currentRelations,
    createdRelations: group.relationsToMove,
  };
}

function createManifestEntry(
  group: AuthorDedupeApplyGroupPlan,
  generatedAt: string,
  status: AuthorDedupeApplyManifestEntry['status'],
): AuthorDedupeApplyManifestEntry {
  return {
    groupId: group.groupId,
    canonicalAuthorId: group.decision.canonicalAuthorId,
    duplicateAuthorIds: [...group.decision.mergeAuthorIds],
    status,
    checkpoint: 'planned',
    relationsMoved: 0,
    relationsSkippedAsDuplicate: 0,
    canonicalUpdated: false,
    duplicatesArchived: 0,
    startedAt: null,
    completedAt: null,
    updatedAt: generatedAt,
    error: null,
  };
}

function createInitialResult(generatedAt: string, groupsPlanned: number): AuthorDedupeApplyResult {
  return {
    generatedAt,
    groupsPlanned,
    groupsApplied: 0,
    groupsSkipped: 0,
    groupsFailed: 0,
    canonicalAuthorsUpdated: 0,
    duplicateAuthorsArchived: 0,
    relationsMoved: 0,
    duplicateRelationsAvoided: 0,
    partial: 0,
    failed: 0,
  };
}

function pickSelectedFields(selectedFields: AuthorDedupeSelectedFields) {
  return SELECTED_FIELD_NAMES.reduce<Partial<AuthorDedupeSelectedFields>>((fields, fieldName) => {
    if (Object.hasOwn(selectedFields, fieldName)) {
      fields[fieldName] = selectedFields[fieldName] as never;
    }

    return fields;
  }, {});
}

function groupRelationsByAuthorId(relations: AuthorDedupeRelationSnapshot[]) {
  const relationsByAuthorId = new Map<string, AuthorDedupeRelationSnapshot[]>();

  for (const relation of relations) {
    const currentRelations = relationsByAuthorId.get(relation.authorId) ?? [];
    currentRelations.push(relation);
    relationsByAuthorId.set(relation.authorId, currentRelations);
  }

  return relationsByAuthorId;
}

function normalizeSelectedFieldsForFingerprint(selectedFields: AuthorDedupeSelectedFields) {
  return SELECTED_FIELD_NAMES.reduce<Record<string, string | number | boolean | null>>(
    (fields, fieldName) => {
      if (Object.hasOwn(selectedFields, fieldName)) {
        fields[fieldName] = selectedFields[fieldName];
      }

      return fields;
    },
    {},
  );
}
