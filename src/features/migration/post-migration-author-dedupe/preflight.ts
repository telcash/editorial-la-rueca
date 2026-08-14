import type {
  AuthorDedupeApplyConflict,
  AuthorDedupeApplyManifest,
  AuthorDedupeApplyPlan,
} from './apply-types';
import type { AuthorDedupeApplyRepository } from './apply-repository';

export async function runAuthorDedupePreflight(
  plan: AuthorDedupeApplyPlan,
  repository: Pick<AuthorDedupeApplyRepository, 'readAuthorsBySlugs'>,
): Promise<AuthorDedupeApplyConflict[]> {
  const conflicts: AuthorDedupeApplyConflict[] = [...plan.conflicts];
  const selectedSlugs = plan.groups
    .map((group) => group.selectedFields.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
  const authorsWithSelectedSlugs = await repository.readAuthorsBySlugs(selectedSlugs);

  for (const group of plan.groups) {
    const allowedAuthorIds = new Set([group.decision.canonicalAuthorId, ...group.authorsToArchive]);

    for (const author of authorsWithSelectedSlugs) {
      if (author.slug !== group.selectedFields.slug || allowedAuthorIds.has(author.id)) {
        continue;
      }

      conflicts.push({
        code: 'SLUG_COLLISION',
        severity: 'error',
        groupId: group.groupId,
        authorId: author.id,
        message: 'El slug seleccionado ya pertenece a un autor ajeno al grupo.',
        details: `${group.selectedFields.slug} pertenece a ${author.id}.`,
      });
    }

    const duplicateBookIds = new Set<string>();

    for (const relation of group.currentRelations) {
      if (!relation.bookExists) {
        conflicts.push({
          code: 'RELATION_INCONSISTENCY',
          severity: 'error',
          groupId: group.groupId,
          authorId: relation.authorId,
          message: 'Existe una relacion hacia un libro no verificable.',
          details: relation.bookId,
        });
      }

      const relationKey = `${relation.bookId}:${relation.authorId}`;

      if (duplicateBookIds.has(relationKey)) {
        conflicts.push({
          code: 'RELATION_INCONSISTENCY',
          severity: 'error',
          groupId: group.groupId,
          authorId: relation.authorId,
          message: 'Relacion duplicada inesperada en book_authors.',
          details: relationKey,
        });
      }

      duplicateBookIds.add(relationKey);
    }
  }

  return dedupeConflicts(conflicts);
}

export function validateAuthorDedupeResumeState(input: {
  apply: boolean;
  resume: boolean;
  planFingerprint: string;
  existingManifest: AuthorDedupeApplyManifest | null;
}): AuthorDedupeApplyConflict[] {
  if (!input.apply) {
    return [];
  }

  const conflicts: AuthorDedupeApplyConflict[] = [];
  const hasStartedApply = Boolean(
    input.existingManifest?.entries.some((entry) =>
      ['in_progress', 'applied', 'partial', 'failed'].includes(entry.status),
    ),
  );

  if (!input.resume && hasStartedApply) {
    conflicts.push({
      code: 'APPLY_ALREADY_STARTED',
      severity: 'error',
      groupId: 'runtime',
      authorId: null,
      message: 'Existe un manifest de apply con operaciones ya iniciadas.',
      details: 'Usa --resume para continuar de forma explicita.',
    });
  }

  if (input.resume && !input.existingManifest) {
    conflicts.push({
      code: 'MISSING_MANIFEST_FOR_RESUME',
      severity: 'error',
      groupId: 'runtime',
      authorId: null,
      message: 'No existe manifest previo para reanudar.',
      details: 'Ejecuta primero una migracion inicial.',
    });
  }

  if (
    input.resume &&
    input.existingManifest &&
    input.existingManifest.planFingerprint !== input.planFingerprint
  ) {
    conflicts.push({
      code: 'FINGERPRINT_MISMATCH',
      severity: 'error',
      groupId: 'runtime',
      authorId: null,
      message: 'El fingerprint del manifest previo no coincide con el plan actual.',
      details: 'No es seguro reanudar con decisiones distintas.',
    });
  }

  return conflicts;
}

function dedupeConflicts(conflicts: AuthorDedupeApplyConflict[]) {
  const seen = new Set<string>();

  return conflicts.filter((conflict) => {
    const key = `${conflict.code}:${conflict.severity}:${conflict.groupId}:${conflict.authorId ?? ''}:${conflict.details}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
