import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { AuthorDedupeAudit, AuthorDedupeFinalReview, AuthorDuplicateGroup } from './types';

export async function writeAuthorDedupeFinalReviewOutputs(params: {
  audit: AuthorDedupeAudit;
  review: AuthorDedupeFinalReview;
  outputDirectory: string;
}) {
  const outputDirectory = path.resolve(params.outputDirectory);
  await mkdir(outputDirectory, { recursive: true });

  const files = [
    await writeText(
      outputDirectory,
      'author-dedupe-decisions.json',
      `${JSON.stringify(params.review, null, 2)}\n`,
    ),
    await writeText(
      outputDirectory,
      'author-dedupe-final-review.html',
      renderFinalReviewHtml(params.audit, params.review),
    ),
  ];

  return files;
}

function renderFinalReviewHtml(audit: AuthorDedupeAudit, review: AuthorDedupeFinalReview) {
  const serializedGroups = JSON.stringify(audit.groups.map(toBrowserGroup));
  const serializedReview = JSON.stringify(review);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Revisión final de autores duplicados - Editorial La Rueca</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #171717; background: #f7f4f1; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .summary, .group, .author, .simulation { border: 1px solid #ded8d2; border-radius: 8px; background: #fff; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 14px; }
    .metric { padding: 10px; border-radius: 6px; background: #f7f4f1; }
    .metric strong { display: block; font-size: 24px; color: #e02b20; }
    .io-actions, .group-actions, .selectors { display: flex; flex-wrap: wrap; gap: 8px; }
    button, select, textarea { border: 1px solid #d8d2cc; border-radius: 7px; background: #fff; padding: 8px 10px; font: inherit; }
    button { cursor: pointer; font-weight: 700; }
    button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid rgba(224, 43, 32, 0.35); outline-offset: 2px; }
    button[aria-pressed="true"], .selected-option { border-color: #e02b20; box-shadow: 0 0 0 3px rgba(224, 43, 32, 0.16); }
    .group { margin-top: 24px; padding: 20px; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; background: #e02b20; color: #fff; }
    .authors { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 14px; }
    .author { padding: 14px; }
    .author img, .photo-option img { width: 76px; height: 76px; object-fit: cover; border-radius: 50%; border: 1px solid #ded8d2; background: #eee; }
    .photo-options, .bio-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 10px; }
    .photo-option, .bio-option { display: grid; gap: 6px; text-align: left; }
    .bio-option { min-height: 120px; }
    .meta, .books, .small { font-size: 13px; line-height: 1.45; color: #555; }
    .simulation { margin-top: 14px; padding: 14px; background: #fbfaf8; }
    code { background: #f2efec; padding: 2px 4px; border-radius: 4px; }
    textarea { width: min(100%, 520px); min-height: 70px; display: block; margin-top: 8px; }
    ul { padding-left: 18px; }
  </style>
</head>
<body>
  <main>
    <h1>Revisión final de autores duplicados</h1>
    <p>Esta revisión es read-only respecto a PostgreSQL. Las decisiones se guardan en localStorage y deben exportarse a <code>author-dedupe-decisions.json</code> para una fase futura.</p>
    <div class="io-actions">
      <button id="export-decisions" type="button">EXPORTAR DECISIONES</button>
      <button id="import-decisions" type="button">IMPORTAR DECISIONES</button>
      <input id="import-decisions-file" type="file" accept="application/json" hidden />
    </div>
    <section class="summary">
      ${renderMetric('Total', 'totalGroups', review.statistics.totalGroups)}
      ${renderMetric('Pendientes', 'proposalOnly', review.statistics.proposalOnly)}
      ${renderMetric('Merge', 'merge', review.statistics.merge)}
      ${renderMetric('Separar', 'keepSeparate', review.statistics.keepSeparate)}
      ${renderMetric('Manual', 'manualReview', review.statistics.manualReview)}
      ${renderMetric('Revisados', 'reviewed', review.statistics.reviewed)}
      ${renderMetric('Conflictos foto', 'photoConflicts', review.statistics.photoConflicts)}
      ${renderMetric('Conflictos bio', 'biographyConflicts', review.statistics.biographyConflicts)}
    </section>
    ${audit.groups.map(renderGroup).join('\n')}
  </main>
  <script>
    const groups = ${serializedGroups};
    const initialReview = ${serializedReview};
    const storageKey = 'editorial-la-rueca:author-dedupe:final-review';
    const groupsById = Object.fromEntries(groups.map((group) => [group.groupId, group]));
    let decisions = loadDecisions();

    function loadDecisions() {
      const stored = parseJson(localStorage.getItem(storageKey));
      const imported = normalizeImported(stored);
      return Object.fromEntries(initialReview.decisions.map((decision) => {
        const restored = imported[decision.groupId];
        return [decision.groupId, restored || decision];
      }));
    }

    function normalizeImported(value) {
      const records = value && Array.isArray(value.decisions) ? value.decisions : [];
      return Object.fromEntries(records
        .filter((record) => record && groupsById[record.groupId])
        .map((record) => {
          const group = groupsById[record.groupId];
          const authorIds = new Set(group.authors.map((author) => author.id));
          const initial = initialReview.decisions.find((decision) => decision.groupId === record.groupId);
          const canonicalAuthorId = authorIds.has(record.canonicalAuthorId)
            ? record.canonicalAuthorId
            : initial.canonicalAuthorId;
          const allowedPhotos = new Set(group.authors.map((author) => author.photoUrl).filter(Boolean));
          const allowedBiographies = new Set(group.authors.map((author) => author.biography).filter(Boolean));
          return [record.groupId, {
            ...initial,
            decision: isDecision(record.decision) ? record.decision : null,
            canonicalAuthorId,
            mergeAuthorIds: group.authors.map((author) => author.id).filter((authorId) => authorId !== canonicalAuthorId),
            selectedFields: {
              ...initial.selectedFields,
              photoUrl: record.selectedFields && (record.selectedFields.photoUrl === null || allowedPhotos.has(record.selectedFields.photoUrl))
                ? record.selectedFields.photoUrl
                : initial.selectedFields.photoUrl,
              biography: record.selectedFields && (record.selectedFields.biography === null || allowedBiographies.has(record.selectedFields.biography))
                ? record.selectedFields.biography
                : initial.selectedFields.biography,
            },
            notes: typeof record.notes === 'string' ? record.notes : '',
            reviewed: Boolean(record.reviewed),
            updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
          }];
        }));
    }

    function persist() {
      localStorage.setItem(storageKey, JSON.stringify(createExportPayload(), null, 2));
      renderState();
    }

    function createExportPayload() {
      const records = Object.values(decisions);
      return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        decisions: records,
        statistics: calculateStats(records),
      };
    }

    function calculateStats(records) {
      return {
        totalGroups: records.length,
        proposalOnly: records.filter((record) => record.decision === null).length,
        merge: records.filter((record) => record.decision === 'merge').length,
        keepSeparate: records.filter((record) => record.decision === 'keep_separate').length,
        manualReview: records.filter((record) => record.decision === 'manual_review').length,
        reviewed: records.filter((record) => record.reviewed).length,
        pendingReview: records.filter((record) => !record.reviewed).length,
        highConfidence: records.filter((record) => record.classification === 'HIGH_CONFIDENCE_DUPLICATE').length,
        likelyDuplicate: records.filter((record) => record.classification === 'LIKELY_DUPLICATE').length,
        originalManualReview: records.filter((record) => record.classification === 'MANUAL_REVIEW').length,
        photoConflicts: records.filter((record) => record.fieldConflicts.includes('photoUrl')).length,
        biographyConflicts: records.filter((record) => record.fieldConflicts.includes('biography')).length,
      };
    }

    function renderState() {
      const stats = calculateStats(Object.values(decisions));
      Object.entries(stats).forEach(([key, value]) => {
        document.querySelectorAll('[data-stat="' + key + '"]').forEach((node) => {
          node.textContent = String(value);
        });
      });

      document.querySelectorAll('[data-group-id]').forEach((section) => {
        const groupId = section.dataset.groupId;
        const decision = decisions[groupId];
        section.querySelector('[data-current-canonical]').textContent = decision.canonicalAuthorId;
        section.querySelector('[data-current-photo]').textContent = decision.selectedFields.photoUrl || 'Sin foto';
        section.querySelector('[data-current-biography]').textContent = decision.selectedFields.biography ? 'Biografía seleccionada' : 'Sin biografía';
        section.querySelector('[data-reviewed]').checked = decision.reviewed;
        section.querySelector('[data-notes]').value = decision.notes;
        section.querySelectorAll('[data-decision]').forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.decision === String(decision.decision)));
        });
        section.querySelectorAll('[data-canonical-option]').forEach((option) => {
          option.classList.toggle('selected-option', option.dataset.canonicalOption === decision.canonicalAuthorId);
        });
        section.querySelectorAll('[data-photo-option]').forEach((option) => {
          option.classList.toggle('selected-option', option.dataset.photoOption === String(decision.selectedFields.photoUrl));
        });
        section.querySelectorAll('[data-biography-option]').forEach((option) => {
          option.classList.toggle('selected-option', option.dataset.biographyOption === String(decision.selectedFields.biography));
        });
      });
    }

    document.querySelectorAll('[data-decision]').forEach((button) => {
      button.addEventListener('click', () => {
        const groupId = button.closest('[data-group-id]').dataset.groupId;
        decisions[groupId] = { ...decisions[groupId], decision: valueOrNull(button.dataset.decision), updatedAt: new Date().toISOString() };
        persist();
      });
    });

    document.querySelectorAll('[data-canonical-option]').forEach((button) => {
      button.addEventListener('click', () => {
        const groupId = button.closest('[data-group-id]').dataset.groupId;
        const group = groupsById[groupId];
        const canonicalAuthorId = button.dataset.canonicalOption;
        decisions[groupId] = {
          ...decisions[groupId],
          canonicalAuthorId,
          mergeAuthorIds: group.authors.map((author) => author.id).filter((authorId) => authorId !== canonicalAuthorId),
          updatedAt: new Date().toISOString(),
        };
        persist();
      });
    });

    document.querySelectorAll('[data-photo-option]').forEach((button) => {
      button.addEventListener('click', () => {
        const groupId = button.closest('[data-group-id]').dataset.groupId;
        decisions[groupId] = {
          ...decisions[groupId],
          selectedFields: { ...decisions[groupId].selectedFields, photoUrl: valueOrNull(button.dataset.photoOption) },
          updatedAt: new Date().toISOString(),
        };
        persist();
      });
    });

    document.querySelectorAll('[data-biography-option]').forEach((button) => {
      button.addEventListener('click', () => {
        const groupId = button.closest('[data-group-id]').dataset.groupId;
        decisions[groupId] = {
          ...decisions[groupId],
          selectedFields: { ...decisions[groupId].selectedFields, biography: valueOrNull(button.dataset.biographyOption) },
          updatedAt: new Date().toISOString(),
        };
        persist();
      });
    });

    document.querySelectorAll('[data-reviewed]').forEach((input) => {
      input.addEventListener('change', () => {
        const groupId = input.closest('[data-group-id]').dataset.groupId;
        decisions[groupId] = { ...decisions[groupId], reviewed: input.checked, updatedAt: new Date().toISOString() };
        persist();
      });
    });

    document.querySelectorAll('[data-notes]').forEach((input) => {
      input.addEventListener('input', () => {
        const groupId = input.closest('[data-group-id]').dataset.groupId;
        decisions[groupId] = { ...decisions[groupId], notes: input.value, updatedAt: new Date().toISOString() };
        persist();
      });
    });

    document.getElementById('export-decisions').addEventListener('click', () => {
      downloadJson('author-dedupe-decisions.json', createExportPayload());
    });

    document.getElementById('import-decisions').addEventListener('click', () => {
      document.getElementById('import-decisions-file').click();
    });

    document.getElementById('import-decisions-file').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const imported = parseJson(await file.text());
      decisions = normalizeImported(imported);
      persist();
      event.target.value = '';
    });

    function valueOrNull(value) {
      return value === 'null' ? null : value;
    }

    function isDecision(value) {
      return value === null || value === 'merge' || value === 'keep_separate' || value === 'manual_review';
    }

    function parseJson(value) {
      try { return value ? JSON.parse(value) : null; } catch { return null; }
    }

    function downloadJson(filename, payload) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }

    renderState();
  </script>
</body>
</html>
`;
}

function renderGroup(group: AuthorDuplicateGroup) {
  return `<section class="group" data-group-id="${escapeHtml(group.groupId)}">
    <h2>${escapeHtml(group.groupId)} <span class="badge">${group.classification}</span></h2>
    <p><strong>Canónico actual:</strong> <code data-current-canonical>${escapeHtml(
      group.canonicalAuthorId,
    )}</code></p>
    <p class="small">${group.classificationReasons.map(escapeHtml).join(' ')}</p>
    <div class="group-actions" aria-label="Decisión">
      <button type="button" data-decision="merge">Merge</button>
      <button type="button" data-decision="keep_separate">Keep separate</button>
      <button type="button" data-decision="manual_review">Manual review</button>
      <button type="button" data-decision="null">Sin decisión</button>
    </div>
    <label class="small"><input type="checkbox" data-reviewed /> Revisado</label>
    <label class="small">Notas <textarea data-notes></textarea></label>
    <h3>Autores candidatos</h3>
    <div class="authors">${group.authors.map((author) => renderAuthor(group, author)).join('')}</div>
    <h3>Foto</h3>
    <p class="small">Seleccionada: <span data-current-photo></span></p>
    <div class="photo-options">
      <button type="button" class="photo-option" data-photo-option="null">Sin foto</button>
      ${group.authors
        .filter((author) => author.photoUrl)
        .map(
          (author) =>
            `<button type="button" class="photo-option" data-photo-option="${escapeHtml(
              author.photoUrl ?? '',
            )}"><img src="${escapeHtml(author.photoUrl ?? '')}" alt="Foto de ${escapeHtml(
              author.name,
            )}" loading="lazy" /><span>${escapeHtml(author.name)}</span><code>${escapeHtml(
              author.id,
            )}</code></button>`,
        )
        .join('')}
    </div>
    <h3>Biografía</h3>
    <p class="small">Estado: <span data-current-biography></span></p>
    <div class="bio-options">
      <button type="button" class="bio-option" data-biography-option="null">Sin biografía</button>
      ${group.authors
        .filter((author) => author.biography)
        .map(
          (author) =>
            `<button type="button" class="bio-option" data-biography-option="${escapeHtml(
              author.biography ?? '',
            )}"><strong>${escapeHtml(author.name)}</strong><span>${escapeHtml(
              author.biography ?? '',
            )}</span><code>${escapeHtml(author.id)}</code></button>`,
        )
        .join('')}
    </div>
    <div class="simulation">
      <h3>Simulación final</h3>
      <p>Autor canónico → libros consolidados</p>
      <ul>${group.relationSimulation.proposedFinal
        .map(
          (relation) =>
            `<li>${escapeHtml(relation.title)} <code>${escapeHtml(relation.bookId)}</code></li>`,
        )
        .join('')}</ul>
    </div>
  </section>`;
}

function renderAuthor(
  group: AuthorDuplicateGroup,
  author: AuthorDuplicateGroup['authors'][number],
) {
  return `<article class="author" data-canonical-option="${escapeHtml(author.id)}">
    ${
      author.photoUrl
        ? `<img src="${escapeHtml(author.photoUrl)}" alt="Foto de ${escapeHtml(author.name)}" loading="lazy" />`
        : ''
    }
    <h3>${escapeHtml(author.name)}${author.id === group.canonicalAuthorId ? ' (propuesto)' : ''}</h3>
    <button type="button" data-canonical-option="${escapeHtml(author.id)}">Elegir como canónico</button>
    <p class="meta">
      ID: <code>${escapeHtml(author.id)}</code><br />
      Slug: <code>${escapeHtml(author.slug)}</code><br />
      País: ${escapeHtml(author.country ?? 'Sin país')}<br />
      Publicado: ${author.isPublished ? 'sí' : 'no'} · Destacado: ${author.isFeatured ? 'sí' : 'no'} · Archivado: ${
        author.isArchived ? 'sí' : 'no'
      }<br />
      Web: ${escapeHtml(author.websiteUrl ?? 'Sin web')}<br />
      Instagram: ${escapeHtml(author.instagramUrl ?? 'Sin Instagram')}<br />
      Facebook: ${escapeHtml(author.facebookUrl ?? 'Sin Facebook')}
    </p>
    <p class="meta"><strong>Biografía:</strong> ${escapeHtml(author.biography ?? 'Sin biografía')}</p>
    <div class="books"><strong>Libros:</strong><ul>${author.books
      .map(
        (book) =>
          `<li>${escapeHtml(book.title)} <code>${escapeHtml(book.bookId)}</code> <code>${escapeHtml(
            book.slug,
          )}</code> ${book.isPublished ? 'publicado' : 'borrador'} ${
            book.isArchived ? 'archivado' : 'activo'
          }</li>`,
      )
      .join('')}</ul></div>
  </article>`;
}

function toBrowserGroup(group: AuthorDuplicateGroup) {
  return {
    groupId: group.groupId,
    authors: group.authors.map((author) => ({
      id: author.id,
      photoUrl: author.photoUrl,
      biography: author.biography,
    })),
  };
}

function renderMetric(label: string, stat: string, value: number) {
  return `<div class="metric"><strong data-stat="${stat}">${value}</strong>${escapeHtml(label)}</div>`;
}

async function writeText(directory: string, filename: string, value: string) {
  const filePath = path.join(directory, filename);
  await writeFile(filePath, value, 'utf8');

  return filePath;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
