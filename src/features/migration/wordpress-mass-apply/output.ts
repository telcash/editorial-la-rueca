import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { MassApplyPlan } from './types';

export async function writeMassApplyOutputs(plan: MassApplyPlan, outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ['apply-plan.json', plan],
    ['authors.json', plan.authors],
    ['books.json', plan.books],
    ['relations.json', plan.relations],
    ['editions.json', plan.editions],
    ['author-images.json', plan.authorImages],
    ['book-covers.json', plan.bookCovers],
    ['conflicts.json', plan.conflicts],
    ['manifest.json', plan.manifest],
    ['result.json', plan.result],
    ['rollback-plan.json', plan.rollbackPlan],
    ['author-deduplication-map.json', plan.authorDeduplicationMap],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );
  await writeFileAtomic(
    path.join(outputDirectory, 'mass-migration-preview.html'),
    renderPreviewHtml(plan),
  );

  return [
    ...files.map(([filename]) => path.join(outputDirectory, filename)),
    path.join(outputDirectory, 'mass-migration-preview.html'),
  ];
}

async function writeJsonAtomic(filePath: string, data: unknown) {
  await writeFileAtomic(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeFileAtomic(filePath: string, content: string) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, filePath);
}

function renderPreviewHtml(plan: MassApplyPlan) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mass Migration Preview</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1, h2 { font-family: Georgia, serif; }
    section { margin-bottom: 24px; padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .stat { padding: 12px; border: 1px solid #e1e1df; border-radius: 8px; background: #fafafa; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; border-bottom: 1px solid #eee; text-align: left; vertical-align: top; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
  </style>
</head>
<body>
  <h1>Mass Migration Preview</h1>
  <section>
    <h2>Resumen</h2>
    <div class="stats">
      ${stat('Autores crear', plan.summary.authorsToCreate)}
      ${stat('Autores piloto', plan.summary.authorsReusedFromPilot)}
      ${stat('Libros crear', plan.summary.booksToCreate)}
      ${stat('Libros piloto', plan.summary.booksReusedFromPilot)}
      ${stat('Relaciones ready', plan.summary.relationsReady)}
      ${stat('Ediciones', plan.summary.editionsReady)}
      ${stat('Fotos autor ready', plan.summary.authorImagesReady)}
      ${stat('Portadas ready', plan.summary.bookCoversReady)}
      ${stat('Batches', plan.summary.batches)}
      ${stat('Blockers', plan.summary.blockers)}
    </div>
  </section>
  ${renderTable(
    'Autores',
    plan.authors.map((author) => [
      author.candidateKey,
      author.action,
      author.resolvedSlug,
      author.strategy,
    ]),
  )}
  ${renderTable(
    'Libros',
    plan.books.map((book) => [
      book.candidateKey,
      book.action,
      book.input.slug,
      book.warnings.join(' | '),
    ]),
  )}
  ${renderTable(
    'Relaciones',
    plan.relations.map((relation) => [
      relation.relationKey,
      relation.action,
      relation.status,
      relation.blockingReasons.join(' | '),
    ]),
  )}
  ${renderTable(
    'Fotos',
    plan.authorImages.map((image) => [
      image.candidateKey,
      image.action,
      image.status,
      image.url ?? '',
    ]),
  )}
  ${renderTable(
    'Portadas',
    plan.bookCovers.map((image) => [
      image.candidateKey,
      image.action,
      image.status,
      image.url ?? '',
    ]),
  )}
  <section>
    <h2>Casos especiales</h2>
    <p><code>book:r</code> se mantiene como SKIPPED_MANUAL_REVIEW por INVALID_OR_UNVERIFIED_TITLE.</p>
    <p>Duplicate authors preserved: ${plan.summary.duplicateAuthorRecordsPreserved}</p>
    <p>Pilot reconciliation mappings: ${plan.summary.pilotMappingsReconciled}</p>
    <p>BACKUP_REQUIRED_BEFORE_APPLY: ${String(plan.summary.backupRequiredBeforeApply)}</p>
  </section>
</body>
</html>
`;
}

function stat(label: string, value: number) {
  return `<div class="stat"><strong>${escapeHtml(label)}</strong><br>${value}</div>`;
}

function renderTable(title: string, rows: string[][]) {
  return `<section>
  <h2>${escapeHtml(title)}</h2>
  <table>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`,
        )
        .join('')}
    </tbody>
  </table>
</section>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
