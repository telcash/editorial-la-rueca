import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { toCsv } from './csv';
import type { AuthorDedupeAudit, AuthorDuplicateGroup } from './types';

export interface AuthorDedupeOutputResult {
  outputDirectory: string;
  files: string[];
}

export async function writeAuthorDedupeOutputs(
  audit: AuthorDedupeAudit,
  outputDirectory: string,
): Promise<AuthorDedupeOutputResult> {
  const absoluteOutputDirectory = path.resolve(outputDirectory);
  await mkdir(absoluteOutputDirectory, { recursive: true });

  const files = [
    await writeJson(absoluteOutputDirectory, 'author-duplicate-audit.json', audit),
    await writeText(
      absoluteOutputDirectory,
      'author-duplicate-audit.csv',
      toCsv(buildAuditCsvRows(audit.groups)),
    ),
    await writeText(
      absoluteOutputDirectory,
      'author-duplicate-review.html',
      buildReviewHtml(audit),
    ),
    await writeJson(absoluteOutputDirectory, 'author-dedupe-plan.json', buildDedupePlan(audit)),
    await writeJson(absoluteOutputDirectory, 'author-dedupe-summary.json', audit.summary),
  ];

  return {
    outputDirectory: absoluteOutputDirectory,
    files,
  };
}

function buildAuditCsvRows(groups: AuthorDuplicateGroup[]) {
  return groups.flatMap((group) =>
    group.authors.map((author) => ({
      groupId: group.groupId,
      classification: group.classification,
      canonicalAuthorId: group.canonicalAuthorId,
      authorId: author.id,
      name: author.name,
      slug: author.slug,
      normalizedName: author.normalizedName,
      slugBase: author.slugBase,
      bookCount: author.books.length,
      isPublished: author.isPublished,
      isFeatured: author.isFeatured,
      isArchived: author.isArchived,
      hasPhoto: Boolean(author.photoUrl),
      hasBiography: Boolean(author.biography),
      conflicts: group.conflicts.join('|'),
    })),
  );
}

function buildDedupePlan(audit: AuthorDedupeAudit) {
  return {
    generatedAt: audit.summary.generatedAt,
    readOnly: true,
    strategy: audit.strategy,
    groups: audit.groups.map((group) => ({
      groupId: group.groupId,
      classification: group.classification,
      canonicalAuthorId: group.canonicalAuthorId,
      duplicateAuthorIds: group.authors
        .map((author) => author.id)
        .filter((authorId) => authorId !== group.canonicalAuthorId),
      fieldProposals: group.fieldProposals,
      relationSimulation: group.relationSimulation,
      conflicts: group.conflicts,
    })),
  };
}

function buildReviewHtml(audit: AuthorDedupeAudit) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Revisión de autores duplicados - Editorial La Rueca</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #171717; background: #f7f4f1; }
    main { max-width: 1180px; margin: 0 auto; padding: 32px 20px; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .summary, .group, .author { border: 1px solid #ded8d2; border-radius: 8px; background: #fff; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; padding: 16px; }
    .metric { padding: 12px; border-radius: 6px; background: #f7f4f1; }
    .metric strong { display: block; font-size: 24px; }
    .group { margin-top: 24px; padding: 20px; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; background: #e02b20; color: #fff; }
    .authors { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 14px; }
    .author { padding: 14px; }
    .author img { width: 72px; height: 72px; object-fit: cover; border-radius: 50%; border: 1px solid #ded8d2; }
    .placeholder { width: 72px; height: 72px; display: grid; place-items: center; border-radius: 50%; background: #eee; color: #777; }
    .meta, .books, .conflicts { font-size: 13px; line-height: 1.45; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th, td { border-top: 1px solid #eee; padding: 8px; text-align: left; vertical-align: top; }
    th { color: #666; background: #fafafa; }
    code { background: #f2efec; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    <h1>Revisión de autores duplicados</h1>
    <p>Informe read-only generado desde PostgreSQL. No realiza cambios en datos ni Storage.</p>
    ${buildSummaryHtml(audit)}
    ${audit.groups.map(buildGroupHtml).join('\n')}
  </main>
</body>
</html>
`;
}

function buildSummaryHtml(audit: AuthorDedupeAudit) {
  const metrics = [
    ['Autores totales', audit.summary.totalAuthors],
    ['Grupos duplicados', audit.summary.duplicateGroupsDetected],
    ['Autores afectados', audit.summary.affectedAuthors],
    ['Libros afectados', audit.summary.affectedBooks],
    ['Alta confianza', audit.summary.highConfidenceDuplicate],
    ['Probables', audit.summary.likelyDuplicate],
    ['Revisión manual', audit.summary.manualReview],
    ['Conflictos foto', audit.summary.groupsWithPhotoConflicts],
    ['Conflictos biografía', audit.summary.groupsWithBiographyConflicts],
  ];

  return `<section class="summary">${metrics
    .map(
      ([label, value]) =>
        `<div class="metric"><strong>${value}</strong>${escapeHtml(String(label))}</div>`,
    )
    .join('')}</section>`;
}

function buildGroupHtml(group: AuthorDuplicateGroup) {
  return `<section class="group">
    <h2>${escapeHtml(group.groupId)} <span class="badge">${group.classification}</span></h2>
    <p><strong>Autor canónico propuesto:</strong> <code>${escapeHtml(group.canonicalAuthorId)}</code></p>
    <p class="meta"><strong>Razones:</strong> ${group.classificationReasons.map(escapeHtml).join(' ')}</p>
    <p class="conflicts"><strong>Conflictos:</strong> ${
      group.conflicts.length > 0
        ? group.conflicts.map(escapeHtml).join(', ')
        : 'Sin conflictos detectados'
    }</p>
    <div class="authors">${group.authors.map((author) => buildAuthorHtml(author, group.canonicalAuthorId)).join('')}</div>
    <h3>Relaciones finales propuestas</h3>
    <table>
      <thead><tr><th>Libro</th><th>Book ID</th><th>Autores origen</th></tr></thead>
      <tbody>${group.relationSimulation.proposedFinal
        .map(
          (relation) =>
            `<tr><td>${escapeHtml(relation.title)}</td><td><code>${escapeHtml(
              relation.bookId,
            )}</code></td><td>${relation.sourceAuthorIds.map(escapeHtml).join('<br>')}</td></tr>`,
        )
        .join('')}</tbody>
    </table>
  </section>`;
}

function buildAuthorHtml(
  author: AuthorDuplicateGroup['authors'][number],
  canonicalAuthorId: string,
) {
  return `<article class="author">
    ${
      author.photoUrl
        ? `<img src="${escapeHtml(author.photoUrl)}" alt="Foto de ${escapeHtml(author.name)}" loading="lazy" />`
        : '<div class="placeholder">Sin foto</div>'
    }
    <h3>${escapeHtml(author.name)}${author.id === canonicalAuthorId ? ' (canónico)' : ''}</h3>
    <p class="meta">
      <code>${escapeHtml(author.slug)}</code><br>
      ID: <code>${escapeHtml(author.id)}</code><br>
      País: ${escapeHtml(author.country ?? 'Sin país')}<br>
      Publicado: ${author.isPublished ? 'sí' : 'no'} · Destacado: ${author.isFeatured ? 'sí' : 'no'} · Archivado: ${
        author.isArchived ? 'sí' : 'no'
      }<br>
      Creado: ${escapeHtml(author.createdAt)}<br>
      Actualizado: ${escapeHtml(author.updatedAt)}
    </p>
    <p class="meta"><strong>Biografía:</strong> ${escapeHtml(preview(author.biography))}</p>
    <div class="books"><strong>Libros:</strong><ul>${author.books
      .map(
        (book) =>
          `<li>${escapeHtml(book.title)} <code>${escapeHtml(book.slug)}</code> ${
            book.isPublished ? 'publicado' : 'borrador'
          } ${book.isArchived ? 'archivado' : 'activo'}</li>`,
      )
      .join('')}</ul></div>
  </article>`;
}

async function writeJson(directory: string, filename: string, value: unknown) {
  return writeText(directory, filename, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(directory: string, filename: string, value: string) {
  const filePath = path.join(directory, filename);
  await writeFile(filePath, value, 'utf8');

  return filePath;
}

function preview(value: string | null) {
  if (!value) {
    return 'null';
  }

  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 220 ? `${text.slice(0, 220)}...` : text;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
