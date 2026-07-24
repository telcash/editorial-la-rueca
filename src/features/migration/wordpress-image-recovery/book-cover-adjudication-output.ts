import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  BookCoverAdjudication,
  BookCoverAdjudicationCandidate,
  BookCoverAdjudicationItem,
} from './book-cover-adjudication';

export async function writeBookCoverAdjudicationOutputs(
  adjudication: BookCoverAdjudication,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });

  const safeBookCovers = adjudication.items.filter((item) => item.decision === 'safe_book_cover');
  const ambiguousBookCovers = adjudication.items.filter((item) => item.decision === 'ambiguous');
  const rejectedAuthorPhotos = adjudication.items.flatMap((item) =>
    item.candidates
      .filter((candidate) => candidate.isEquivalentToAuthorPhoto)
      .map((candidate) => ({
        candidateKey: item.candidateKey,
        title: item.title,
        author: item.author,
        candidate,
      })),
  );
  const files: Array<[string, unknown]> = [
    ['book-cover-adjudication.json', adjudication.items],
    ['safe-book-covers.json', safeBookCovers],
    ['ambiguous-book-covers.json', ambiguousBookCovers],
    ['rejected-author-photos.json', rejectedAuthorPhotos],
    ['book-cover-adjudication-statistics.json', adjudication.statistics],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );
  await writeFileAtomic(
    path.join(outputDirectory, 'book-cover-adjudication.html'),
    renderAdjudicationHtml(adjudication),
  );

  return [
    ...files.map(([filename]) => path.join(outputDirectory, filename)),
    path.join(outputDirectory, 'book-cover-adjudication.html'),
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

function renderAdjudicationHtml(adjudication: BookCoverAdjudication) {
  const rows = adjudication.items.flatMap((item) =>
    item.candidates.length > 0
      ? item.candidates.map((candidate) => renderCandidateRow(item, candidate))
      : [renderEmptyRow(item)],
  );

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Adjudicación de portadas</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1, h2 { font-family: Georgia, serif; }
    .filters, .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    button, .metric { border: 1px solid #ddd; background: #fff; border-radius: 8px; padding: 8px 10px; }
    .metric strong { color: #e02b20; display: block; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 8px; border-bottom: 1px solid #e6e6e2; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #fff; }
    img { width: 72px; height: 108px; object-fit: cover; border: 1px solid #ddd; background: #f3f3f0; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
    .small { color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Adjudicación read-only de portadas</h1>
  <p>No aplica cambios. Agrupa variantes equivalentes y separa señales de portada de señales de foto de autor.</p>
  <section class="summary">
    <div class="metric"><strong>${adjudication.statistics.safeBookCover}</strong>safe_book_cover</div>
    <div class="metric"><strong>${adjudication.statistics.ambiguous}</strong>ambiguous</div>
    <div class="metric"><strong>${adjudication.statistics.noSafeCandidate}</strong>no_safe_candidate</div>
    <div class="metric"><strong>${adjudication.statistics.rejectedByAuthorPhotoConflict}</strong>conflicto foto autor</div>
  </section>
  <h2>Calibración</h2>
  <pre>${escapeHtml(JSON.stringify(adjudication.statistics, null, 2))}</pre>
  <div class="filters">
    <button data-filter="all">Todos</button>
    <button data-filter="safe_book_cover">safe_book_cover</button>
    <button data-filter="ambiguous">ambiguous</button>
    <button data-filter="no_safe_candidate">no_safe_candidate</button>
    <button data-filter="author_conflict">conflicto foto autor</button>
    <button data-filter="cover_keyword">keyword portada</button>
    <button data-filter="title_match">coincidencia título</button>
  </div>
  <table>
    <thead>
      <tr>
        <th>Libro</th>
        <th>Autor</th>
        <th>Miniatura</th>
        <th>Origen</th>
        <th>Dimensiones</th>
        <th>positiveCoverScore</th>
        <th>negativeAuthorScore</th>
        <th>finalScore</th>
        <th>Señales positivas</th>
        <th>Señales negativas</th>
        <th>Ganadora</th>
        <th>Diferencia</th>
        <th>Decisión</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join('')}
    </tbody>
  </table>
  <script>
    document.querySelectorAll('button[data-filter]').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        document.querySelectorAll('tbody tr').forEach((row) => {
          row.hidden = filter !== 'all' && !row.dataset.filters.split(' ').includes(filter);
        });
      });
    });
  </script>
</body>
</html>
`;
}

function renderCandidateRow(
  item: BookCoverAdjudicationItem,
  candidate: BookCoverAdjudicationCandidate,
) {
  const dimensions =
    candidate.width && candidate.height
      ? `${candidate.width}x${candidate.height} (${candidate.ratio ?? ''})`
      : '';
  const url = candidate.urls[0];
  const filters = [
    item.decision,
    item.hasAuthorPhotoConflict ? 'author_conflict' : '',
    item.hasCoverKeyword ? 'cover_keyword' : '',
    item.hasTitleMatch ? 'title_match' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `<tr data-filters="${escapeHtml(filters)}">
  <td><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.candidateKey)}</code></td>
  <td>${escapeHtml(item.author)}</td>
  <td>${url ? `<img src="${escapeHtml(url)}" alt="">` : ''}</td>
  <td>${escapeHtml(candidate.origins.join(' | '))}<br><span class="small">${escapeHtml(candidate.filenames.join(' | '))}</span></td>
  <td>${escapeHtml(dimensions)}</td>
  <td>${candidate.positiveCoverScore}</td>
  <td>${candidate.negativeAuthorScore}</td>
  <td>${candidate.finalScore}</td>
  <td>${escapeHtml(candidate.positiveSignals.join(' | '))}</td>
  <td>${escapeHtml(candidate.negativeSignals.join(' | '))}</td>
  <td>${candidate.isWinner ? 'sí' : 'no'}</td>
  <td>${candidate.gapToNextCandidate ?? ''}</td>
  <td><code>${escapeHtml(item.decision)}</code><br>${escapeHtml(item.decisionReasons.join(' | '))}</td>
</tr>`;
}

function renderEmptyRow(item: BookCoverAdjudicationItem) {
  return `<tr data-filters="${escapeHtml(item.decision)}">
  <td><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.candidateKey)}</code></td>
  <td>${escapeHtml(item.author)}</td>
  <td></td>
  <td></td>
  <td></td>
  <td>0</td>
  <td>0</td>
  <td>0</td>
  <td></td>
  <td></td>
  <td>no</td>
  <td></td>
  <td><code>${escapeHtml(item.decision)}</code></td>
</tr>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
