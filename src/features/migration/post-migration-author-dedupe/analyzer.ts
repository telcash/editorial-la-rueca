import {
  getSlugNumericSuffix,
  normalizeAuthorName,
  normalizeComparableText,
  normalizeSlugBase,
} from './normalize';
import type {
  AuthorDedupeAudit,
  AuthorDedupeAuthor,
  AuthorDedupeFieldProposal,
  AuthorDedupeRelationSimulation,
  AuthorDedupeSourceAuthor,
  AuthorDuplicateClassification,
  AuthorDuplicateGroup,
} from './types';

const dedupeStrategy = [
  'Reasignar relaciones de libros desde duplicados hacia el autor canónico.',
  'Completar metadatos faltantes en el autor canónico sin destruir textos ni imágenes en conflicto.',
  'Verificar manualmente el resultado en backoffice.',
  'Archivar autores duplicados no canónicos.',
  'Revisar los grupos marcados como MANUAL_REVIEW antes de cualquier cambio.',
  'Dejar el borrado definitivo para una fase posterior opcional.',
];

export function buildAuthorDedupeAudit(
  authors: AuthorDedupeSourceAuthor[],
  generatedAt = new Date().toISOString(),
): AuthorDedupeAudit {
  const enrichedAuthors = authors.map(enrichAuthor);
  const groups = detectDuplicateGroups(enrichedAuthors);
  const affectedBookIds = new Set(
    groups.flatMap((group) =>
      group.relationSimulation.proposedFinal.map((relation) => relation.bookId),
    ),
  );

  return {
    summary: {
      generatedAt,
      totalAuthors: authors.length,
      duplicateGroupsDetected: groups.length,
      affectedAuthors: groups.reduce((total, group) => total + group.authors.length, 0),
      highConfidenceDuplicate: countGroups(groups, 'HIGH_CONFIDENCE_DUPLICATE'),
      likelyDuplicate: countGroups(groups, 'LIKELY_DUPLICATE'),
      manualReview: countGroups(groups, 'MANUAL_REVIEW'),
      keepSeparate: countGroups(groups, 'KEEP_SEPARATE'),
      affectedBooks: affectedBookIds.size,
      groupsWithPhotoConflicts: groups.filter((group) => group.conflicts.includes('photoUrl'))
        .length,
      groupsWithBiographyConflicts: groups.filter((group) => group.conflicts.includes('biography'))
        .length,
      relationsToConsolidate: groups.reduce(
        (total, group) => total + group.relationSimulation.proposedFinal.length,
        0,
      ),
    },
    groups,
    strategy: dedupeStrategy,
  };
}

function enrichAuthor(author: AuthorDedupeSourceAuthor): AuthorDedupeAuthor {
  const biographyLength = normalizeComparableText(author.biography).length;
  const metadataScore =
    (author.photoUrl ? 25 : 0) +
    Math.min(Math.floor(biographyLength / 120), 25) +
    (author.websiteUrl ? 8 : 0) +
    (author.instagramUrl ? 6 : 0) +
    (author.facebookUrl ? 6 : 0) +
    (author.country ? 5 : 0) +
    (author.isPublished ? 10 : 0) +
    (author.isFeatured ? 5 : 0);

  return {
    ...author,
    normalizedName: normalizeAuthorName(author.name),
    slugBase: normalizeSlugBase(author.slug),
    slugNumericSuffix: getSlugNumericSuffix(author.slug),
    metadataScore,
  };
}

function detectDuplicateGroups(authors: AuthorDedupeAuthor[]) {
  const graph = new Map<string, Set<string>>();
  const authorsById = new Map(authors.map((author) => [author.id, author]));

  for (const author of authors) {
    graph.set(author.id, new Set());
  }

  connectByKey(authors, graph, (author) => `name:${author.normalizedName}`);
  connectByKey(authors, graph, (author) => `slug:${author.slugBase}`);

  const visited = new Set<string>();
  const groups: AuthorDuplicateGroup[] = [];

  for (const author of authors) {
    if (visited.has(author.id)) {
      continue;
    }

    const groupAuthorIds = collectConnectedAuthorIds(author.id, graph, visited);

    if (groupAuthorIds.length < 2) {
      continue;
    }

    const groupAuthors = groupAuthorIds
      .map((id) => authorsById.get(id))
      .filter((candidate): candidate is AuthorDedupeAuthor => candidate !== undefined)
      .sort(compareAuthorsForReview);

    groups.push(buildGroup(groups.length + 1, groupAuthors));
  }

  return groups;
}

function connectByKey(
  authors: AuthorDedupeAuthor[],
  graph: Map<string, Set<string>>,
  getKey: (author: AuthorDedupeAuthor) => string,
) {
  const groups = new Map<string, string[]>();

  for (const author of authors) {
    const key = getKey(author);
    const ids = groups.get(key) ?? [];
    ids.push(author.id);
    groups.set(key, ids);
  }

  for (const ids of groups.values()) {
    if (ids.length < 2) {
      continue;
    }

    for (const id of ids) {
      const linkedIds = graph.get(id);

      if (!linkedIds) {
        continue;
      }

      for (const nextId of ids) {
        if (nextId !== id) {
          linkedIds.add(nextId);
        }
      }
    }
  }
}

function collectConnectedAuthorIds(
  firstId: string,
  graph: Map<string, Set<string>>,
  visited: Set<string>,
) {
  const pending = [firstId];
  const groupIds: string[] = [];

  while (pending.length > 0) {
    const id = pending.pop();

    if (!id || visited.has(id)) {
      continue;
    }

    visited.add(id);
    groupIds.push(id);

    for (const nextId of graph.get(id) ?? []) {
      if (!visited.has(nextId)) {
        pending.push(nextId);
      }
    }
  }

  return groupIds;
}

function buildGroup(index: number, authors: AuthorDedupeAuthor[]): AuthorDuplicateGroup {
  const canonical = selectCanonicalAuthor(authors);
  const conflicts = getConflicts(authors);
  const classification = classifyGroup(authors, conflicts);

  return {
    groupId: `author-duplicate-${String(index).padStart(3, '0')}`,
    classification,
    classificationReasons: getClassificationReasons(authors, conflicts, classification),
    canonicalAuthorId: canonical.id,
    canonicalReasons: getCanonicalReasons(canonical),
    authors,
    fieldProposals: buildFieldProposals(authors, canonical),
    relationSimulation: buildRelationSimulation(authors, canonical.id),
    conflicts,
  };
}

function selectCanonicalAuthor(authors: AuthorDedupeAuthor[]) {
  return [...authors].sort((firstAuthor, secondAuthor) => {
    const firstBaseSlug = firstAuthor.slugNumericSuffix === null ? 1 : 0;
    const secondBaseSlug = secondAuthor.slugNumericSuffix === null ? 1 : 0;

    if (firstBaseSlug !== secondBaseSlug) {
      return secondBaseSlug - firstBaseSlug;
    }

    if (firstAuthor.metadataScore !== secondAuthor.metadataScore) {
      return secondAuthor.metadataScore - firstAuthor.metadataScore;
    }

    return new Date(firstAuthor.createdAt).getTime() - new Date(secondAuthor.createdAt).getTime();
  })[0];
}

function getCanonicalReasons(author: AuthorDedupeAuthor) {
  const reasons: string[] = [];

  if (author.slugNumericSuffix === null) {
    reasons.push('Tiene slug base sin sufijo numérico.');
  }

  if (author.photoUrl) {
    reasons.push('Tiene fotografía.');
  }

  if (author.biography) {
    reasons.push('Tiene biografía.');
  }

  if (author.isPublished) {
    reasons.push('Está publicado.');
  }

  reasons.push('Se usa antigüedad del registro como desempate final.');

  return reasons;
}

function classifyGroup(
  authors: AuthorDedupeAuthor[],
  conflicts: string[],
): AuthorDuplicateClassification {
  const normalizedNameCount = new Set(authors.map((author) => author.normalizedName)).size;
  const slugBaseCount = new Set(authors.map((author) => author.slugBase)).size;
  const hasNumberedSlugPattern = authors.some((author) => author.slugNumericSuffix !== null);
  const importantConflicts = conflicts.filter(
    (field) => field !== 'isPublished' && field !== 'isFeatured',
  );

  if (normalizedNameCount === 1 && slugBaseCount === 1 && hasNumberedSlugPattern) {
    return importantConflicts.length === 0 ? 'HIGH_CONFIDENCE_DUPLICATE' : 'LIKELY_DUPLICATE';
  }

  if (normalizedNameCount === 1 || slugBaseCount === 1) {
    return importantConflicts.length > 1 ? 'MANUAL_REVIEW' : 'LIKELY_DUPLICATE';
  }

  return 'MANUAL_REVIEW';
}

function getClassificationReasons(
  authors: AuthorDedupeAuthor[],
  conflicts: string[],
  classification: AuthorDuplicateClassification,
) {
  const reasons: string[] = [];
  const normalizedNameCount = new Set(authors.map((author) => author.normalizedName)).size;
  const slugBaseCount = new Set(authors.map((author) => author.slugBase)).size;

  if (normalizedNameCount === 1) {
    reasons.push('Nombre normalizado idéntico.');
  }

  if (slugBaseCount === 1) {
    reasons.push('Slug base idéntico tras retirar sufijos numéricos.');
  }

  if (authors.some((author) => author.slugNumericSuffix !== null)) {
    reasons.push('Existe patrón de slug con sufijo numérico.');
  }

  if (conflicts.length > 0) {
    reasons.push(`Metadata con conflicto: ${conflicts.join(', ')}.`);
  }

  if (classification === 'MANUAL_REVIEW') {
    reasons.push('La evidencia no basta para fusionar sin revisión humana.');
  }

  return reasons;
}

function getConflicts(authors: AuthorDedupeAuthor[]) {
  const fields = [
    'photoUrl',
    'biography',
    'country',
    'websiteUrl',
    'instagramUrl',
    'facebookUrl',
    'isPublished',
    'isFeatured',
  ] as const;

  return fields.filter((field) => {
    const values = new Set(
      authors
        .map((author) => author[field])
        .filter((value) => value !== null && value !== '')
        .map((value) =>
          typeof value === 'string' ? normalizeComparableText(value) : String(value),
        ),
    );

    return values.size > 1;
  });
}

function buildFieldProposals(
  authors: AuthorDedupeAuthor[],
  canonical: AuthorDedupeAuthor,
): AuthorDedupeFieldProposal[] {
  return [
    proposeStringField(authors, canonical, 'name', 'Se conserva el nombre del autor canónico.'),
    proposeStringField(authors, canonical, 'slug', 'Se conserva el slug del autor canónico.'),
    proposeStringField(
      authors,
      canonical,
      'photoUrl',
      'Se conserva la única foto disponible o la del canónico.',
    ),
    proposeBiography(authors, canonical),
    proposeStringField(
      authors,
      canonical,
      'country',
      'Se conserva metadata no vacía priorizando el canónico.',
    ),
    proposeStringField(
      authors,
      canonical,
      'websiteUrl',
      'Se conserva metadata no vacía priorizando el canónico.',
    ),
    proposeStringField(
      authors,
      canonical,
      'instagramUrl',
      'Se conserva metadata no vacía priorizando el canónico.',
    ),
    proposeStringField(
      authors,
      canonical,
      'facebookUrl',
      'Se conserva metadata no vacía priorizando el canónico.',
    ),
    {
      field: 'isPublished',
      proposedValue: authors.some((author) => author.isPublished),
      sourceAuthorId: canonical.id,
      conflict: new Set(authors.map((author) => author.isPublished)).size > 1,
      reason: 'Propuesta conservadora: mantener publicado si alguna copia ya estaba publicada.',
    },
    {
      field: 'isFeatured',
      proposedValue: authors.some((author) => author.isFeatured),
      sourceAuthorId: canonical.id,
      conflict: new Set(authors.map((author) => author.isFeatured)).size > 1,
      reason: 'Propuesta conservadora: mantener destacado si alguna copia ya estaba destacada.',
    },
    {
      field: 'sortOrder',
      proposedValue: Math.min(...authors.map((author) => author.sortOrder)),
      sourceAuthorId: canonical.id,
      conflict: new Set(authors.map((author) => author.sortOrder)).size > 1,
      reason: 'Se propone el menor sortOrder para no desplazar al autor hacia abajo.',
    },
  ];
}

function proposeStringField(
  authors: AuthorDedupeAuthor[],
  canonical: AuthorDedupeAuthor,
  field: keyof Pick<
    AuthorDedupeAuthor,
    'name' | 'slug' | 'photoUrl' | 'country' | 'websiteUrl' | 'instagramUrl' | 'facebookUrl'
  >,
  reason: string,
): AuthorDedupeFieldProposal {
  const source =
    canonical[field] !== null && canonical[field] !== ''
      ? canonical
      : (authors.find((author) => author[field] !== null && author[field] !== '') ?? canonical);
  const distinctValues = new Set(
    authors
      .map((author) => author[field])
      .filter((value) => value !== null && value !== '')
      .map((value) => normalizeComparableText(value)),
  );

  return {
    field,
    proposedValue: source[field],
    sourceAuthorId: source.id,
    conflict: distinctValues.size > 1,
    reason,
  };
}

function proposeBiography(
  authors: AuthorDedupeAuthor[],
  canonical: AuthorDedupeAuthor,
): AuthorDedupeFieldProposal {
  const source = [...authors].sort((firstAuthor, secondAuthor) => {
    const firstLength = normalizeComparableText(firstAuthor.biography).length;
    const secondLength = normalizeComparableText(secondAuthor.biography).length;

    if (firstLength !== secondLength) {
      return secondLength - firstLength;
    }

    return firstAuthor.id === canonical.id ? -1 : 1;
  })[0];
  const distinctValues = new Set(
    authors
      .map((author) => normalizeComparableText(author.biography))
      .filter((value) => value.length > 0),
  );

  return {
    field: 'biography',
    proposedValue: source.biography,
    sourceAuthorId: source.id,
    conflict: distinctValues.size > 1,
    reason: 'Se propone la biografía más completa sin combinar textos automáticamente.',
  };
}

function buildRelationSimulation(
  authors: AuthorDedupeAuthor[],
  canonicalAuthorId: string,
): AuthorDedupeRelationSimulation {
  const current = authors.flatMap((author) =>
    author.books.map((book) => ({
      authorId: author.id,
      bookId: book.bookId,
      title: book.title,
      isPublished: book.isPublished,
      isArchived: book.isArchived,
    })),
  );
  const byBookId = new Map<string, { title: string; sourceAuthorIds: string[] }>();

  for (const relation of current) {
    const existing = byBookId.get(relation.bookId) ?? {
      title: relation.title,
      sourceAuthorIds: [],
    };
    existing.sourceAuthorIds.push(relation.authorId);
    byBookId.set(relation.bookId, existing);
  }

  return {
    current,
    proposedFinal: [...byBookId.entries()].map(([bookId, relation]) => ({
      authorId: canonicalAuthorId,
      bookId,
      title: relation.title,
      sourceAuthorIds: relation.sourceAuthorIds,
    })),
    duplicateRelationsToSkip: [...byBookId.entries()]
      .filter(([, relation]) => relation.sourceAuthorIds.length > 1)
      .map(([bookId, relation]) => ({
        bookId,
        title: relation.title,
        sourceAuthorIds: relation.sourceAuthorIds,
      })),
  };
}

function compareAuthorsForReview(
  firstAuthor: AuthorDedupeAuthor,
  secondAuthor: AuthorDedupeAuthor,
) {
  return firstAuthor.slug.localeCompare(secondAuthor.slug, 'es');
}

function countGroups(
  groups: AuthorDuplicateGroup[],
  classification: AuthorDuplicateClassification,
) {
  return groups.filter((group) => group.classification === classification).length;
}
