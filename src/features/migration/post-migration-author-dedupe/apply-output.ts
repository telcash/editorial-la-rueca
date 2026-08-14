import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AuthorDedupeApplyManifest,
  AuthorDedupeApplyPlan,
  AuthorDedupeRollbackPlan,
} from './apply-types';

export async function writeAuthorDedupeApplyOutputs(
  plan: AuthorDedupeApplyPlan,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });

  const files = [
    path.join(outputDirectory, 'apply-plan.json'),
    path.join(outputDirectory, 'manifest.json'),
    path.join(outputDirectory, 'rollback-plan.json'),
    path.join(outputDirectory, 'result.json'),
    path.join(outputDirectory, 'conflicts.json'),
    path.join(outputDirectory, 'apply-preview.html'),
  ];

  await Promise.all([
    writeJson(files[0], serializeApplyPlan(plan)),
    writeJson(files[1], plan.manifest),
    writeJson(files[2], plan.rollbackPlan),
    writeJson(files[3], plan.result),
    writeJson(files[4], plan.conflicts),
    writeFile(files[5], renderApplyPreviewHtml(plan), 'utf8'),
  ]);

  return files;
}

export async function readExistingAuthorDedupeApplyState(outputDirectory: string) {
  const [manifest, rollbackPlan] = await Promise.all([
    readOptionalJson<AuthorDedupeApplyManifest>(path.join(outputDirectory, 'manifest.json')),
    readOptionalJson<AuthorDedupeRollbackPlan>(path.join(outputDirectory, 'rollback-plan.json')),
  ]);

  return {
    manifest,
    rollbackPlan,
  };
}

function serializeApplyPlan(plan: AuthorDedupeApplyPlan) {
  return {
    generatedAt: plan.generatedAt,
    mode: plan.mode,
    planFingerprint: plan.planFingerprint,
    decisionsFile: plan.decisionsFile,
    batchSize: plan.batchSize,
    summary: plan.summary,
    groups: plan.groups.map((group) => ({
      groupId: group.groupId,
      canonicalAuthor: group.canonicalAuthor,
      duplicates: group.duplicates,
      selectedFields: group.selectedFields,
      currentRelations: group.currentRelations,
      finalRelations: group.finalRelations,
      relationsToMove: group.relationsToMove,
      relationsSkippedAsDuplicate: group.relationsSkippedAsDuplicate,
      authorsToArchive: group.authorsToArchive,
      conflicts: group.conflicts,
    })),
  };
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function readOptionalJson<TData>(filePath: string): Promise<TData | null> {
  try {
    const content = await readFile(filePath, 'utf8');

    return JSON.parse(content) as TData;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function renderApplyPreviewHtml(plan: AuthorDedupeApplyPlan) {
  const groups = plan.groups
    .map(
      (group) => `<article class="group">
        <header>
          <p class="eyebrow">${escapeHtml(group.groupId)}</p>
          <h2>${escapeHtml(group.canonicalAuthor?.name ?? group.decision.canonicalAuthorId)}</h2>
          <p>Duplicados a archivar: ${group.authorsToArchive.length}</p>
        </header>
        <section>
          <h3>Campos seleccionados</h3>
          <pre>${escapeHtml(JSON.stringify(group.selectedFields, null, 2))}</pre>
        </section>
        <section>
          <h3>Relaciones</h3>
          <p>Mover: ${group.relationsToMove.length}. Evitar duplicadas: ${group.relationsSkippedAsDuplicate.length}.</p>
          <ul>
            ${group.finalRelations
              .map(
                (relation) =>
                  `<li>${escapeHtml(relation.title)} (${escapeHtml(relation.bookId)})</li>`,
              )
              .join('')}
          </ul>
        </section>
        <section>
          <h3>Conflictos</h3>
          ${
            group.conflicts.length === 0
              ? '<p>Sin conflictos.</p>'
              : `<ul>${group.conflicts
                  .map(
                    (conflict) =>
                      `<li><strong>${escapeHtml(conflict.severity)}</strong> ${escapeHtml(conflict.code)}: ${escapeHtml(conflict.message)}</li>`,
                  )
                  .join('')}</ul>`
          }
        </section>
      </article>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Author dedupe apply preview</title>
    <style>
      body {
        margin: 0;
        background: #f7f3ee;
        color: #1b1b1b;
        font-family: Arial, sans-serif;
      }
      main {
        margin: 0 auto;
        max-width: 1180px;
        padding: 32px;
      }
      h1,
      h2,
      h3 {
        font-family: Georgia, serif;
      }
      .summary,
      .group {
        border: 1px solid #e4ded6;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 10px 28px rgb(0 0 0 / 7%);
        margin-bottom: 20px;
        padding: 20px;
      }
      .eyebrow {
        color: #d71920;
        font-weight: 700;
        text-transform: uppercase;
      }
      pre {
        background: #f4f4f4;
        border-radius: 6px;
        overflow: auto;
        padding: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="summary">
        <p class="eyebrow">Read-only preview</p>
        <h1>Fusion de autores duplicados</h1>
        <p>Grupos aprobados: ${plan.summary.approvedGroups}</p>
        <p>Relaciones a mover: ${plan.summary.relationsToMove}</p>
        <p>Relaciones duplicadas a evitar: ${plan.summary.duplicateRelationsToAvoid}</p>
        <p>Blockers: ${plan.summary.blockers}</p>
      </section>
      ${groups}
    </main>
  </body>
</html>
`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
