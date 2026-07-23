import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AuthorDuplicateReviewGroup, BookRAnalysis, DuplicateProposal } from './resolution';

export interface AuthorDuplicateReviewFile {
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
}

export interface MassResolutionSimulationFile {
  bookR: BookRAnalysis;
}

export interface FinalReviewInput {
  generatedAt?: string;
  duplicateReview: AuthorDuplicateReviewFile;
  simulation: MassResolutionSimulationFile;
  massDirectory: string;
}

export interface FieldResolution {
  nameFrom: string | null;
  slugFrom: string | null;
  shortBioFrom: string | null;
  biographyFrom: string | null;
  photoFrom: string | null;
  websiteFrom: string | null;
  instagramFrom: string | null;
  facebookFrom: string | null;
  countryFrom: string | null;
  requiresFieldDecision: boolean;
}

export interface MassDecisionsReview {
  generatedAt: string;
  note: string;
  authorDuplicateGroups: Record<
    string,
    {
      recommendedAction: 'merge' | 'keep_separate' | 'manual_review';
      approvedAction: null;
      canonicalCandidateKey: string | null;
      mergeCandidates: string[];
      confidence: 'high' | 'medium' | 'low';
      reasons: string[];
      fieldResolution: FieldResolution;
    }
  >;
}

export interface DecisionSummary {
  generatedAt: string;
  counts: {
    safeToApproveMerge: number;
    needsPhotoDecision: number;
    needsBiographyDecision: number;
    needsMultipleFieldDecisions: number;
    possibleKeepSeparate: number;
  };
  groups: {
    SAFE_TO_APPROVE_MERGE: string[];
    NEEDS_PHOTO_DECISION: string[];
    NEEDS_BIOGRAPHY_DECISION: string[];
    NEEDS_MULTIPLE_FIELD_DECISIONS: string[];
    POSSIBLE_KEEP_SEPARATE: string[];
  };
}

export interface FinalReviewResult {
  generatedAt: string;
  orderedGroups: AuthorDuplicateReviewGroup[];
  decisionsReview: MassDecisionsReview;
  decisionSummary: DecisionSummary;
  html: string;
}

export interface FinalReviewFiles {
  html: string;
  decisionsReview: string;
  decisionSummary: string;
}

export async function readFinalReviewInput(massDirectory: string): Promise<FinalReviewInput> {
  const resolvedMassDirectory = path.resolve(massDirectory);
  const [duplicateReview, simulation] = await Promise.all([
    readJson<AuthorDuplicateReviewFile>(
      path.join(resolvedMassDirectory, 'author-duplicate-review.json'),
    ),
    readJson<MassResolutionSimulationFile>(
      path.join(resolvedMassDirectory, 'mass-resolution-simulation.json'),
    ),
  ]);

  return {
    duplicateReview,
    simulation,
    massDirectory: resolvedMassDirectory,
  };
}

export async function ensureNoFinalMassDecisions(massDirectory: string) {
  const finalDecisionsPath = path.join(path.resolve(massDirectory), 'mass-decisions.json');

  try {
    await access(finalDecisionsPath);
    throw new Error(
      'mass-decisions.json already exists. This sprint must not create or overwrite final decisions.',
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return;
    }

    throw error;
  }
}

export function createFinalReview(input: FinalReviewInput): FinalReviewResult {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const orderedGroups = orderGroupsForHumanReview(input.duplicateReview.groups);
  const decisionsReview = createMassDecisionsReview(generatedAt, orderedGroups);
  const decisionSummary = createDecisionSummary(generatedAt, orderedGroups);
  const html = renderFinalReviewHtml({
    generatedAt,
    duplicateReview: input.duplicateReview,
    orderedGroups,
    decisionSummary,
    bookR: input.simulation.bookR,
  });

  return {
    generatedAt,
    orderedGroups,
    decisionsReview,
    decisionSummary,
    html,
  };
}

export async function writeFinalReviewOutputs(
  result: FinalReviewResult,
  massDirectory: string,
): Promise<FinalReviewFiles> {
  const resolvedMassDirectory = path.resolve(massDirectory);
  await mkdir(resolvedMassDirectory, { recursive: true });
  const files: FinalReviewFiles = {
    html: path.join(resolvedMassDirectory, 'author-duplicate-final-review.html'),
    decisionsReview: path.join(resolvedMassDirectory, 'mass-decisions-review.json'),
    decisionSummary: path.join(resolvedMassDirectory, 'author-duplicate-decision-summary.json'),
  };

  await Promise.all([
    writeFile(files.html, result.html, 'utf8'),
    writeJson(files.decisionsReview, result.decisionsReview),
    writeJson(files.decisionSummary, result.decisionSummary),
  ]);

  return files;
}

export function orderGroupsForHumanReview(groups: AuthorDuplicateReviewGroup[]) {
  const priority: Record<DuplicateProposal, number> = {
    MERGE_HIGH_CONFIDENCE: 0,
    LIKELY_MERGE_MANUAL_CONFIRMATION: 1,
    KEEP_SEPARATE: 2,
    MANUAL_REVIEW: 3,
  };

  return [...groups].sort(
    (left, right) =>
      priority[left.proposal] - priority[right.proposal] ||
      left.groupId.localeCompare(right.groupId),
  );
}

export function createMassDecisionsReview(
  generatedAt: string,
  groups: AuthorDuplicateReviewGroup[],
): MassDecisionsReview {
  return {
    generatedAt,
    note: 'Working file read-only para revision humana. approvedAction debe permanecer null hasta aprobacion explicita.',
    authorDuplicateGroups: Object.fromEntries(
      groups.map((group) => [
        group.groupId,
        {
          recommendedAction: group.proposedAction,
          approvedAction: null,
          canonicalCandidateKey: group.canonicalCandidateKey,
          mergeCandidates: group.mergeCandidates,
          confidence: mapConfidence(group.confidence),
          reasons: group.reasons,
          fieldResolution: createFieldResolution(group),
        },
      ]),
    ),
  };
}

export function createDecisionSummary(
  generatedAt: string,
  groups: AuthorDuplicateReviewGroup[],
): DecisionSummary {
  const summary: DecisionSummary = {
    generatedAt,
    counts: {
      safeToApproveMerge: 0,
      needsPhotoDecision: 0,
      needsBiographyDecision: 0,
      needsMultipleFieldDecisions: 0,
      possibleKeepSeparate: 0,
    },
    groups: {
      SAFE_TO_APPROVE_MERGE: [],
      NEEDS_PHOTO_DECISION: [],
      NEEDS_BIOGRAPHY_DECISION: [],
      NEEDS_MULTIPLE_FIELD_DECISIONS: [],
      POSSIBLE_KEEP_SEPARATE: [],
    },
  };

  for (const group of groups) {
    const fieldResolution = createFieldResolution(group);
    const conflictCodes = getVisibleConflictCodes(group, getBiographyComparison(group));

    if (group.proposedAction === 'keep_separate') {
      summary.groups.POSSIBLE_KEEP_SEPARATE.push(group.groupId);
      continue;
    }

    if (conflictCodes.length === 0 && group.proposal === 'MERGE_HIGH_CONFIDENCE') {
      summary.groups.SAFE_TO_APPROVE_MERGE.push(group.groupId);
      continue;
    }

    if (conflictCodes.includes('PHOTO_CONFLICT')) {
      summary.groups.NEEDS_PHOTO_DECISION.push(group.groupId);
    }

    if (conflictCodes.includes('BIOGRAPHY_CONFLICT')) {
      summary.groups.NEEDS_BIOGRAPHY_DECISION.push(group.groupId);
    }

    if (fieldResolution.requiresFieldDecision || conflictCodes.length > 1) {
      summary.groups.NEEDS_MULTIPLE_FIELD_DECISIONS.push(group.groupId);
    }
  }

  summary.counts = {
    safeToApproveMerge: summary.groups.SAFE_TO_APPROVE_MERGE.length,
    needsPhotoDecision: summary.groups.NEEDS_PHOTO_DECISION.length,
    needsBiographyDecision: summary.groups.NEEDS_BIOGRAPHY_DECISION.length,
    needsMultipleFieldDecisions: summary.groups.NEEDS_MULTIPLE_FIELD_DECISIONS.length,
    possibleKeepSeparate: summary.groups.POSSIBLE_KEEP_SEPARATE.length,
  };

  return summary;
}

export function createFieldResolution(group: AuthorDuplicateReviewGroup): FieldResolution {
  const canonicalCandidateKey = group.canonicalCandidateKey;
  const biographyFrom = pickSingleSourceWithValue(
    group.members.map((member) => ({
      candidateKey: member.candidateKey,
      value: member.biographyPreview ?? null,
    })),
  );
  const photoFrom = group.canonicalPhoto?.authorCandidateKey ?? null;
  const hasPhotoConflict = group.photoClassification === 'MULTIPLE_CONFLICTING_IMAGES';
  const hasBiographyConflict = getBiographyComparison(group) === 'DIFFERENT';

  return {
    nameFrom: canonicalCandidateKey,
    slugFrom: canonicalCandidateKey,
    shortBioFrom: null,
    biographyFrom: hasBiographyConflict ? null : biographyFrom,
    photoFrom: hasPhotoConflict ? null : photoFrom,
    websiteFrom: null,
    instagramFrom: null,
    facebookFrom: null,
    countryFrom: null,
    requiresFieldDecision: hasPhotoConflict || hasBiographyConflict,
  };
}

export function getBiographyComparison(
  group: AuthorDuplicateReviewGroup,
): 'IDENTICAL' | 'SIMILAR' | 'DIFFERENT' | 'MISSING' {
  const values = group.members
    .map((member) => member.biographyPreview ?? member.rawReviewPreview)
    .filter((value): value is string => Boolean(value && value.trim().length > 0));

  if (values.length === 0) {
    return 'MISSING';
  }

  const normalized = [...new Set(values.map(normalizePreview))];

  if (normalized.length === 1) {
    return 'IDENTICAL';
  }

  const [first, ...rest] = normalized;

  if (first && rest.every((value) => similarity(first, value) >= 0.72)) {
    return 'SIMILAR';
  }

  return 'DIFFERENT';
}

export function getVisibleConflictCodes(
  group: AuthorDuplicateReviewGroup,
  biographyComparison = getBiographyComparison(group),
) {
  const conflicts: string[] = [];

  if (group.photoClassification === 'MULTIPLE_CONFLICTING_IMAGES') {
    conflicts.push('PHOTO_CONFLICT');
  }

  if (biographyComparison === 'DIFFERENT') {
    conflicts.push('BIOGRAPHY_CONFLICT');
  }

  if (group.fieldConflicts.some((conflict) => conflict.includes('social'))) {
    conflicts.push('SOCIAL_LINK_CONFLICT');
  }

  if (group.fieldConflicts.some((conflict) => conflict.includes('country'))) {
    conflicts.push('COUNTRY_CONFLICT');
  }

  if (group.fieldConflicts.some((conflict) => conflict.includes('slug'))) {
    conflicts.push('SLUG_CONFLICT');
  }

  return conflicts;
}

function renderFinalReviewHtml(params: {
  generatedAt: string;
  duplicateReview: AuthorDuplicateReviewFile;
  orderedGroups: AuthorDuplicateReviewGroup[];
  decisionSummary: DecisionSummary;
  bookR: BookRAnalysis;
}) {
  const photoConflicts = params.orderedGroups.filter(
    (group) => group.photoClassification === 'MULTIPLE_CONFLICTING_IMAGES',
  ).length;
  const biographyConflicts = params.orderedGroups.filter(
    (group) => getBiographyComparison(group) === 'DIFFERENT',
  ).length;
  const noRelevantConflicts = params.orderedGroups.filter(
    (group) => getVisibleConflictCodes(group).length === 0,
  ).length;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revisión final de duplicados de autores</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .summary, .group, .book-r { margin-bottom: 28px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .stat { padding: 12px; border: 1px solid #e1e1df; border-radius: 8px; background: #fafafa; }
    .candidate-grid, .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .candidate, .photo-card { padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    img { max-width: 100%; width: 140px; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; background: #eee; }
    .cover img { width: 120px; height: 170px; }
    .badge { display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; border-radius: 999px; background: #f1f1ef; font-size: 12px; font-weight: 700; }
    .conflict { background: #fde8e6; color: #9f1d15; }
    .ok { background: #e8f5ea; color: #1f6b2c; }
    .books { margin: 8px 0 0; padding-left: 18px; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
    pre { overflow: auto; padding: 12px; border-radius: 8px; background: #111; color: #f7f7f5; }
  </style>
</head>
<body>
  <h1>Revisión final de duplicados de autores</h1>
  <section class="summary">
    <h2>Resumen</h2>
    <div class="stats">
      ${renderStat('Duplicate groups', String(params.duplicateReview.summary.duplicateGroups))}
      ${renderStat('High-confidence', String(params.duplicateReview.summary.mergeHighConfidence))}
      ${renderStat('Likely merge', String(params.duplicateReview.summary.likelyMergeManualConfirmation))}
      ${renderStat('Photo conflicts', String(photoConflicts))}
      ${renderStat('Biography conflicts', String(biographyConflicts))}
      ${renderStat('Sin conflictos relevantes', String(noRelevantConflicts))}
      ${renderStat('SAFE_TO_APPROVE_MERGE', String(params.decisionSummary.counts.safeToApproveMerge))}
      ${renderStat('Generado', params.generatedAt)}
    </div>
  </section>
  ${params.orderedGroups.map(renderGroup).join('\n')}
  ${renderBookR(params.bookR)}
</body>
</html>
`;
}

function renderGroup(group: AuthorDuplicateReviewGroup) {
  const biographyComparison = getBiographyComparison(group);
  const conflicts = getVisibleConflictCodes(group, biographyComparison);
  const legacyCount = group.members.filter(
    (member) => member.classification === 'legacy_author_book_combined',
  ).length;
  const uniqueBooks = [
    ...new Set(
      group.members.flatMap((member) =>
        member.relatedBooks.map((book) => book.title ?? book.bookCandidateKey),
      ),
    ),
  ];
  const fieldResolution = createFieldResolution(group);

  return `<section class="group">
  <h2>${escapeHtml(group.groupId)}</h2>
  <p>
    <span class="badge">${group.proposal}</span>
    <span class="badge">confidence ${group.confidence}</span>
    <span class="badge">${group.photoClassification}</span>
    <span class="badge">${biographyComparison}</span>
  </p>
  <p><strong>Legacy records:</strong> ${legacyCount} · <strong>Libros únicos:</strong> ${uniqueBooks.length}</p>
  <p><strong>Conflictos:</strong> ${
    conflicts.length > 0
      ? conflicts.map((conflict) => `<span class="badge conflict">${conflict}</span>`).join(' ')
      : '<span class="badge ok">Sin conflictos visibles</span>'
  }</p>
  <h3>Reasons</h3>
  <ul>${group.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
  <h3>Opciones posibles</h3>
  <p><span class="badge">MERGE</span><span class="badge">KEEP_SEPARATE</span><span class="badge">MANUAL_REVIEW</span></p>
  <h3>PROPOSED CANONICAL AUTHOR</h3>
  <p><code>${escapeHtml(group.canonicalCandidateKey ?? 'n/a')}</code></p>
  <pre>${escapeHtml(JSON.stringify(fieldResolution, null, 2))}</pre>
  <h3>Campos propuestos a conservar</h3>
  <pre>${escapeHtml(JSON.stringify(group.proposedMergedData, null, 2))}</pre>
  <h3>Fotos disponibles</h3>
  <div class="photo-grid">${renderPhotos(group)}</div>
  <h3>Candidatos</h3>
  <div class="candidate-grid">${group.members.map(renderCandidate).join('')}</div>
</section>`;
}

function renderPhotos(group: AuthorDuplicateReviewGroup) {
  const photoMembers = group.members.filter(
    (member) => member.thumbnailUrl || member.imageFieldUrl,
  );

  if (photoMembers.length === 0) {
    return '<article class="photo-card">NO_IMAGE</article>';
  }

  return photoMembers
    .map((member) => {
      const urls = [member.thumbnailUrl, member.imageFieldUrl].filter((url): url is string =>
        Boolean(url),
      );

      return `<article class="photo-card">
  <h4>${escapeHtml(member.candidateKey)}</h4>
  ${urls
    .map(
      (url) =>
        `<img src="${escapeHtml(url)}" alt="Foto disponible para ${escapeHtml(member.name)}">`,
    )
    .join('')}
</article>`;
    })
    .join('');
}

function renderCandidate(member: AuthorDuplicateReviewGroup['members'][number]) {
  return `<article class="candidate">
  <h4>${escapeHtml(member.name)}</h4>
  <p><strong>candidateKey:</strong> <code>${escapeHtml(member.candidateKey)}</code></p>
  <p><strong>sourceWpPostId:</strong> ${escapeHtml(member.sourceWpPostId)}</p>
  <p><strong>slug:</strong> ${escapeHtml(member.slug)}</p>
  <p><strong>tipo:</strong> ${escapeHtml(member.classification ?? 'n/a')}</p>
  <p><strong>fecha:</strong> ${escapeHtml(member.createdAt ?? 'n/a')}</p>
  <p><strong>old URL:</strong> ${escapeHtml(member.oldUrl ?? 'n/a')}</p>
  <p><strong>biografía preview:</strong> ${escapeHtml(member.biographyPreview ?? member.rawReviewPreview ?? 'n/a')}</p>
  <p><strong>libros asociados:</strong></p>
  <ul class="books">${member.relatedBooks
    .map(
      (book) =>
        `<li><code>${escapeHtml(book.bookCandidateKey)}</code> ${escapeHtml(book.title ?? 'n/a')}</li>`,
    )
    .join('')}</ul>
</article>`;
}

function renderBookR(bookR: BookRAnalysis) {
  return `<section class="book-r">
  <h2>book:r · MANUAL_REVIEW</h2>
  <p><strong>sourceWpPostId:</strong> ${escapeHtml(bookR.sourceWpPostId ?? 'n/a')}</p>
  <p><strong>tf_libro raw:</strong> ${escapeHtml(bookR.tfLibroRaw ?? 'n/a')}</p>
  <p><strong>normalized title:</strong> ${escapeHtml(bookR.normalizedTitle ?? 'n/a')}</p>
  <p><strong>autor:</strong> ${escapeHtml(bookR.author ?? 'n/a')}</p>
  <p><strong>slug:</strong> ${escapeHtml(bookR.slug ?? 'n/a')}</p>
  <p><strong>old URL:</strong> ${escapeHtml(bookR.oldUrl ?? 'n/a')}</p>
  <p><strong>rawReview:</strong> ${escapeHtml(bookR.rawReviewPreview ?? 'n/a')}</p>
  <div class="photo-grid cover">${bookR.attachments
    .map(
      (attachment) => `<article class="photo-card">
  <p><strong>Attachment:</strong> ${escapeHtml(attachment.attachmentId)}</p>
  ${
    attachment.url
      ? `<img src="${escapeHtml(attachment.url)}" alt="Imagen asociada a book:r">`
      : '<p>Sin URL</p>'
  }
  <p>${escapeHtml(attachment.reason)}</p>
</article>`,
    )
    .join('')}</div>
  <h3>Recomendación</h3>
  <p><span class="badge conflict">MANUAL_REVIEW</span> No corregir automáticamente.</p>
  <ul>${bookR.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
</section>`;
}

function renderStat(label: string, value: string) {
  return `<div class="stat"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</div>`;
}

function pickSingleSourceWithValue(values: Array<{ candidateKey: string; value: string | null }>) {
  const present = values.filter((item) => item.value && item.value.trim().length > 0);
  const normalizedValues = [...new Set(present.map((item) => normalizePreview(item.value ?? '')))];

  return normalizedValues.length === 1 ? (present[0]?.candidateKey ?? null) : null;
}

function mapConfidence(value: number): 'high' | 'medium' | 'low' {
  if (value >= 0.9) {
    return 'high';
  }

  if (value >= 0.7) {
    return 'medium';
  }

  return 'low';
}

function normalizePreview(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(left: string, right: string) {
  const leftTerms = new Set(left.split(' ').filter(Boolean));
  const rightTerms = new Set(right.split(' ').filter(Boolean));
  const intersection = [...leftTerms].filter((term) => rightTerms.has(term)).length;
  const union = new Set([...leftTerms, ...rightTerms]).size;

  return union === 0 ? 0 : intersection / union;
}

async function readJson<TData>(filePath: string): Promise<TData> {
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as TData;
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
