import type { MassApplyConflict, MassApplyPlan } from './types';

export async function runMassApplyPreflight(plan: MassApplyPlan): Promise<MassApplyConflict[]> {
  const conflicts: MassApplyConflict[] = [];

  try {
    const [{ getAuthorBySlug }, { getBookBySlug }] = await Promise.all([
      import('@/services/authors/author.service'),
      import('@/services/books/book.service'),
    ]);

    for (const author of plan.authors) {
      if (author.action !== 'CREATE') {
        continue;
      }

      try {
        await getAuthorBySlug(author.input.slug);
        conflicts.push({
          code: 'EXISTING_SLUG_WITHOUT_MANIFEST',
          severity: 'error',
          entityType: 'author',
          candidateKey: author.candidateKey,
          message: 'Slug de autor ya existe en DB sin mapping demostrado por manifest.',
          details: author.input.slug,
        });
      } catch (error) {
        if (!isNotFoundError(error, 'AuthorNotFoundError')) {
          throw error;
        }
      }
    }

    for (const book of plan.books) {
      if (book.action !== 'CREATE') {
        continue;
      }

      try {
        await getBookBySlug(book.input.slug);
        conflicts.push({
          code: 'EXISTING_SLUG_WITHOUT_MANIFEST',
          severity: 'error',
          entityType: 'book',
          candidateKey: book.candidateKey,
          message: 'Slug de libro ya existe en DB sin mapping demostrado por manifest.',
          details: book.input.slug,
        });
      } catch (error) {
        if (!isNotFoundError(error, 'BookNotFoundError')) {
          throw error;
        }
      }
    }
  } catch (error) {
    conflicts.push({
      code: 'PREFLIGHT_DB_UNAVAILABLE',
      severity: 'error',
      entityType: 'runtime',
      candidateKey: 'preflight-db',
      message: 'No se pudo completar el preflight real contra DB.',
      details: error instanceof Error ? error.message : 'Unknown DB preflight error',
    });
  }

  return conflicts;
}

function isNotFoundError(error: unknown, name: string) {
  return error instanceof Error && error.name === name;
}
