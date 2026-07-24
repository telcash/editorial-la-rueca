import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  serializeEditorialReviewDecisions,
  type EditorialReview,
  type EditorialReviewDecisionRecord,
  type EditorialReviewEntry,
  type EditorialReviewImage,
} from './editorial-review';

export async function writeEditorialReviewOutputs(
  review: EditorialReview,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, string]> = [
    ['editorial-review.json', `${JSON.stringify(review, null, 2)}\n`],
    ['editorial-review.csv', renderCsv(review.entries, review.decisions)],
    ['approved.json', `${JSON.stringify(review.approved, null, 2)}\n`],
    ['rejected.json', `${JSON.stringify(review.rejected, null, 2)}\n`],
    ['manual.json', `${JSON.stringify(review.manual, null, 2)}\n`],
    ['editorial-review.html', renderEditorialReviewHtml(review)],
  ];

  await Promise.all(
    files.map(([filename, content]) =>
      writeFileAtomic(path.join(outputDirectory, filename), content),
    ),
  );

  return files.map(([filename]) => path.join(outputDirectory, filename));
}

function renderCsv(entries: EditorialReviewEntry[], decisions: EditorialReviewDecisionRecord[]) {
  const decisionsByKey = new Map(decisions.map((decision) => [decision.candidateKey, decision]));
  const headers = [
    'candidateKey',
    'sourceWpPostId',
    'title',
    'author',
    'proposedDecision',
    'adjudicationDecision',
    'confidence',
    'winnerUrl',
    'winnerFilename',
    'positiveCoverScore',
    'negativeAuthorScore',
    'finalScore',
    'winnerGap',
    'selectedImageUrl',
    'selectedImageFilename',
    'selectionSource',
    'explanation',
  ];
  const rows = entries.map((entry) => {
    const decision = decisionsByKey.get(entry.candidateKey);

    return [
      entry.candidateKey,
      entry.sourceWpPostId,
      entry.title,
      entry.author,
      entry.proposedDecision,
      entry.adjudicationDecision,
      entry.confidence,
      entry.winnerUrl ?? '',
      entry.winnerFilename ?? '',
      String(entry.positiveCoverScore),
      String(entry.negativeAuthorScore),
      String(entry.finalScore),
      entry.winnerGap === null ? '' : String(entry.winnerGap),
      decision?.selectedImage?.url ?? '',
      decision?.selectedImage?.filename ?? '',
      decision?.selectionSource ?? '',
      entry.explanation.join(' | '),
    ].map(csvCell);
  });

  return `${[headers, ...rows].map((row) => row.join(',')).join('\n')}\n`;
}

function renderEditorialReviewHtml(review: EditorialReview) {
  const serializedEntries = JSON.stringify(review.entries.map(toBrowserEntry));
  const serializedDecisionExport = JSON.stringify(
    serializeEditorialReviewDecisions(review.decisions, review.generatedAt),
  );

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Editorial Review - Portadas</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .summary, .filters, .io-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    .metric, button { border: 1px solid #ddd; background: #fff; border-radius: 8px; padding: 8px 10px; }
    .metric strong { display: block; color: #e02b20; font-size: 22px; }
    button { cursor: pointer; }
    button:focus-visible { outline: 3px solid #e02b20; outline-offset: 2px; }
    article { margin: 18px 0; padding: 16px; background: #fff; border: 1px solid #e6e6e2; border-radius: 8px; }
    .grid { display: grid; grid-template-columns: minmax(160px, 220px) 1fr; gap: 16px; align-items: start; }
    img.cover { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; border: 1px solid #ddd; background: #f3f3f0; }
    .candidates { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; margin-top: 12px; }
    .candidate-image { position: relative; display: grid; gap: 6px; padding: 8px; text-align: left; border: 2px solid #deded8; border-radius: 8px; }
    .candidate-image img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; border: 1px solid #ddd; background: #f3f3f0; }
    .candidate-image[aria-pressed="true"] { border-color: #e02b20; box-shadow: 0 0 0 3px rgba(224, 43, 32, 0.18); }
    .candidate-image[aria-pressed="true"]::after { content: "Seleccionada"; position: absolute; top: 8px; left: 8px; border-radius: 999px; background: #e02b20; color: #fff; padding: 3px 7px; font-size: 11px; font-weight: 700; }
    .candidate-meta { display: grid; gap: 2px; min-width: 0; font-size: 11px; color: #555; }
    .candidate-meta strong { color: #111; overflow-wrap: anywhere; }
    .algorithm-tag { color: #e02b20; font-weight: 700; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .actions button[aria-pressed="true"] { background: #e02b20; color: #fff; border-color: #e02b20; }
    .io-actions button { font-weight: 700; }
    .small { color: #555; font-size: 12px; }
    .status-line { margin-top: 8px; font-weight: 700; }
    .selected-line { color: #e02b20; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Editorial Review de Portadas</h1>
  <p>Revisión editorial read-only. Las decisiones se guardan automáticamente en este navegador con localStorage. Usa “EXPORTAR REVISIÓN” para generar el JSON que consumirá una fase posterior.</p>
  <section class="summary">
    <div class="metric"><strong data-stat="total">${review.statistics.total}</strong>Total</div>
    <div class="metric"><strong data-stat="pending">${review.statistics.pending}</strong>Pendientes</div>
    <div class="metric"><strong data-stat="approved">${review.statistics.approved}</strong>Aprobadas</div>
    <div class="metric"><strong data-stat="approvedWithAlgorithm">${review.statistics.approvedWithAlgorithm}</strong>Aprobadas con algoritmo</div>
    <div class="metric"><strong data-stat="manuallyCorrected">${review.statistics.manuallyCorrected}</strong>Corregidas manualmente</div>
    <div class="metric"><strong data-stat="rejected">${review.statistics.rejected}</strong>Rechazadas</div>
    <div class="metric"><strong data-stat="manual">${review.statistics.manual}</strong>Revisión manual</div>
  </section>
  <div class="io-actions">
    <button id="export-review" type="button">EXPORTAR REVISIÓN</button>
    <button id="import-review" type="button">IMPORTAR REVISIÓN</button>
    <input id="import-review-file" type="file" accept="application/json" hidden>
  </div>
  <div class="filters">
    <button data-filter="all">Todos</button>
    <button data-filter="approved">Aprobados</button>
    <button data-filter="manual">Manual</button>
    <button data-filter="rejected">Rechazados</button>
  </div>
  <main>
    ${review.entries.map(renderReviewEntry).join('')}
  </main>
  <script>
    const reviewEntries = ${serializedEntries};
    const initialReviewExport = ${serializedDecisionExport};
    const storageKey = 'editorial-la-rueca:image-recovery:editorial-review';
    const entriesByKey = Object.fromEntries(reviewEntries.map((entry) => [entry.candidateKey, entry]));
    const initialDecisions = Object.fromEntries(initialReviewExport.decisions.map((decision) => [decision.candidateKey, decision]));
    const decisions = loadDecisions();

    function persist() {
      localStorage.setItem(storageKey, JSON.stringify(createExportPayload(), null, 2));
      renderState();
    }

    function loadDecisions() {
      const saved = parseJson(localStorage.getItem(storageKey));
      const importedDecisions = normalizeImportedDecisions(saved);

      return Object.fromEntries(reviewEntries.map((entry) => {
        const imported = importedDecisions[entry.candidateKey];
        return [entry.candidateKey, imported || initialDecisions[entry.candidateKey]];
      }));
    }

    function normalizeImportedDecisions(value) {
      const source = Array.isArray(value) ? value : value && Array.isArray(value.decisions) ? value.decisions : [];

      return Object.fromEntries(source
        .filter((record) => record && entriesByKey[record.candidateKey])
        .map((record) => {
          const entry = entriesByKey[record.candidateKey];
          const selectedImage = record.selectedImage ? findImage(entry, record.selectedImage.groupKey) : null;
          const base = {
            ...initialDecisions[record.candidateKey],
            decision: isDecision(record.decision) ? record.decision : initialDecisions[record.candidateKey].decision,
            selectedImage,
            updatedAt: record.updatedAt || null,
          };

          return [record.candidateKey, applyDecision(base, base.decision, false)];
        }));
    }

    function renderState() {
      document.querySelectorAll('article[data-candidate-key]').forEach((article) => {
        const candidateKey = article.dataset.candidateKey;
        const decision = decisions[candidateKey];
        article.dataset.currentDecision = decision.decision;
        article.querySelectorAll('button[data-decision]').forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.decision === decision.decision));
        });
        article.querySelectorAll('button[data-image-key]').forEach((button) => {
          button.setAttribute(
            'aria-pressed',
            String(decision.selectedImage && button.dataset.imageKey === decision.selectedImage.groupKey),
          );
        });
        const selectedLine = article.querySelector('[data-selected-line]');
        if (selectedLine) {
          selectedLine.textContent = decision.selectedImage
            ? 'Imagen seleccionada: ' + (decision.selectedImage.filename || decision.selectedImage.groupKey)
            : 'Sin imagen seleccionada';
        }
      });
      updateStats();
    }

    function persistDecision(candidateKey, decision) {
      decisions[candidateKey] = {
        ...decision,
        updatedAt: new Date().toISOString(),
      };
      persist();
    }

    function applyDecision(record, decision, updateTimestamp = true) {
      if (decision !== 'approved') {
        return {
          ...record,
          decision,
          selectedImage: null,
          selectionSource: 'none',
          updatedAt: updateTimestamp ? new Date().toISOString() : record.updatedAt,
        };
      }

      const selectedImage = record.selectedImage || record.algorithmSuggestion;

      return {
        ...record,
        decision,
        selectedImage,
        selectionSource:
          selectedImage && record.algorithmSuggestion && selectedImage.groupKey === record.algorithmSuggestion.groupKey
            ? 'algorithm'
            : 'editorial-manual',
        updatedAt: updateTimestamp ? new Date().toISOString() : record.updatedAt,
      };
    }

    function createExportPayload() {
      const payload = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        decisions: Object.values(decisions),
      };
      payload.statistics = calculateStats(payload.decisions);
      return payload;
    }

    function calculateStats(records) {
      return {
        total: records.length,
        pending: records.filter((record) => !record.decision).length,
        approved: records.filter((record) => record.decision === 'approved').length,
        approvedWithAlgorithm: records.filter(
          (record) => record.decision === 'approved' && record.selectionSource === 'algorithm',
        ).length,
        manuallyCorrected: records.filter(
          (record) => record.decision === 'approved' && record.selectionSource === 'editorial-manual',
        ).length,
        rejected: records.filter((record) => record.decision === 'rejected').length,
        manual: records.filter((record) => record.decision === 'manual').length,
      };
    }

    function updateStats() {
      const stats = calculateStats(Object.values(decisions));
      Object.entries(stats).forEach(([key, value]) => {
        const element = document.querySelector('[data-stat="' + key + '"]');
        if (element) {
          element.textContent = String(value);
        }
      });
    }

    function findImage(entry, groupKey) {
      return entry.candidateImages.find((image) => image.groupKey === groupKey) || null;
    }

    function isDecision(value) {
      return value === 'approved' || value === 'rejected' || value === 'manual';
    }

    function parseJson(value) {
      if (!value) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    function downloadJson(filename, value) {
      const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    document.querySelectorAll('button[data-decision]').forEach((button) => {
      button.addEventListener('click', () => {
        const candidateKey = button.closest('article').dataset.candidateKey;
        persistDecision(candidateKey, applyDecision(decisions[candidateKey], button.dataset.decision));
      });
    });

    document.querySelectorAll('button[data-image-key]').forEach((button) => {
      button.addEventListener('click', () => {
        const article = button.closest('article');
        const candidateKey = article.dataset.candidateKey;
        const image = findImage(entriesByKey[candidateKey], button.dataset.imageKey);

        if (!image) {
          return;
        }

        persistDecision(candidateKey, {
          ...decisions[candidateKey],
          selectedImage: image,
          selectionSource:
            decisions[candidateKey].decision === 'approved'
              ? image.groupKey === decisions[candidateKey].algorithmSuggestion?.groupKey
                ? 'algorithm'
                : 'editorial-manual'
              : decisions[candidateKey].selectionSource,
        });
      });
    });

    document.querySelectorAll('button[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        document.querySelectorAll('article[data-candidate-key]').forEach((article) => {
          article.hidden = filter !== 'all' && article.dataset.currentDecision !== filter;
        });
      });
    });

    document.getElementById('export-review').addEventListener('click', () => {
      downloadJson('editorial-review-decisions.json', createExportPayload());
    });

    document.getElementById('import-review').addEventListener('click', () => {
      document.getElementById('import-review-file').click();
    });

    document.getElementById('import-review-file').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];

      if (!file) {
        return;
      }

      const imported = parseJson(await file.text());
      const importedDecisions = normalizeImportedDecisions(imported);
      Object.assign(decisions, importedDecisions);
      persist();
      event.target.value = '';
    });

    persist();
  </script>
</body>
</html>
`;
}

function renderReviewEntry(entry: EditorialReviewEntry) {
  const discarded = entry.discardedCandidates.slice(0, 6);

  return `<article data-candidate-key="${escapeHtml(entry.candidateKey)}" data-current-decision="${escapeHtml(entry.proposedDecision)}">
  <div class="grid">
    <div>
      ${entry.winnerUrl ? `<img class="cover" src="${escapeHtml(entry.winnerUrl)}" alt="Portada propuesta para ${escapeHtml(entry.title)}">` : ''}
      <p class="status-line selected-line" data-selected-line></p>
      <div class="candidates" aria-label="Imágenes candidatas">
        ${entry.candidateImages.map((image) => renderCandidateImage(entry, image)).join('')}
      </div>
    </div>
    <div>
      <h2>${escapeHtml(entry.title)}</h2>
      <p>${escapeHtml(entry.author)}</p>
      <p><code>${escapeHtml(entry.candidateKey)}</code></p>
      <p><strong>Confianza:</strong> ${escapeHtml(entry.confidence)} · <strong>positive:</strong> ${entry.positiveCoverScore} · <strong>negative author:</strong> ${entry.negativeAuthorScore} · <strong>gap:</strong> ${entry.winnerGap ?? ''}</p>
      <p><strong>Portada propuesta:</strong> ${escapeHtml(entry.winnerFilename ?? '')}</p>
      <p><strong>Explicación:</strong> ${escapeHtml(entry.explanation.join(' | '))}</p>
      <h3>Candidatas descartadas</h3>
      <ul>
        ${discarded
          .map(
            (candidate) =>
              `<li>${escapeHtml(candidate.filenames.join(' | ') || candidate.groupKey)} <span class="small">finalScore ${candidate.finalScore}; ${escapeHtml(candidate.discardReasons.join(' | '))}</span></li>`,
          )
          .join('')}
      </ul>
      <div class="actions" aria-label="Decisión editorial">
        <button type="button" data-decision="approved">APROBAR</button>
        <button type="button" data-decision="rejected">RECHAZAR / SIN PORTADA</button>
        <button type="button" data-decision="manual">REVISIÓN MANUAL</button>
      </div>
    </div>
  </div>
</article>`;
}

function renderCandidateImage(entry: EditorialReviewEntry, image: EditorialReviewImage) {
  const label = `${image.filename ?? image.groupKey}${image.isAlgorithmSuggestion ? ' (propuesta del algoritmo)' : ''}`;

  return `<button type="button" class="candidate-image" data-candidate-key="${escapeHtml(entry.candidateKey)}" data-image-key="${escapeHtml(image.groupKey)}" aria-pressed="${image.isAlgorithmSuggestion ? 'true' : 'false'}">
    ${
      image.url
        ? `<img src="${escapeHtml(image.url)}" alt="Candidata para ${escapeHtml(entry.title)}: ${escapeHtml(label)}">`
        : '<span class="small">Sin URL</span>'
    }
    <span class="candidate-meta">
      <strong>${escapeHtml(image.filename ?? image.groupKey)}</strong>
      ${image.isAlgorithmSuggestion ? '<span class="algorithm-tag">Propuesta del algoritmo</span>' : ''}
      <span>positive ${image.positiveCoverScore}; negative ${image.negativeAuthorScore}; final ${image.finalScore}</span>
      <span>${image.width ?? ''}${image.width && image.height ? 'x' : ''}${image.height ?? ''}</span>
      <span>${escapeHtml(image.origins.join(' | '))}</span>
    </span>
  </button>`;
}

function toBrowserEntry(entry: EditorialReviewEntry) {
  return {
    candidateKey: entry.candidateKey,
    proposedDecision: entry.proposedDecision,
    candidateImages: entry.candidateImages,
  };
}

async function writeFileAtomic(filePath: string, content: string) {
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, filePath);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
