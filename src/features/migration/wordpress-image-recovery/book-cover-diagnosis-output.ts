import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  BookCoverDiagnosis,
  BookCoverDiagnosisCandidate,
  BookCoverDiagnosisItem,
} from './book-cover-diagnosis';

export async function writeBookCoverDiagnosisOutputs(
  diagnosis: BookCoverDiagnosis,
  outputDirectory: string,
) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ['book-cover-diagnosis.json', diagnosis.items],
    ['book-cover-statistics.json', diagnosis.statistics],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );
  await writeFileAtomic(
    path.join(outputDirectory, 'book-cover-diagnosis.html'),
    renderDiagnosisHtml(diagnosis),
  );

  return [
    ...files.map(([filename]) => path.join(outputDirectory, filename)),
    path.join(outputDirectory, 'book-cover-diagnosis.html'),
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

function renderDiagnosisHtml(diagnosis: BookCoverDiagnosis) {
  const rows = diagnosis.items.flatMap((item) =>
    item.candidates.length > 0
      ? item.candidates.map((candidate) => renderCandidateRow(item, candidate))
      : [renderEmptyRow(item)],
  );

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diagnóstico de portadas</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1, h2 { font-family: Georgia, serif; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0; }
    .metric { padding: 12px; background: #fff; border: 1px solid #e6e6e2; border-radius: 8px; }
    .metric strong { display: block; font-size: 24px; color: #e02b20; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 8px; border-bottom: 1px solid #e6e6e2; text-align: left; vertical-align: top; }
    th { cursor: pointer; position: sticky; top: 0; background: #fff; box-shadow: 0 1px 0 #e6e6e2; }
    img { width: 72px; height: 108px; object-fit: cover; border: 1px solid #ddd; background: #f3f3f0; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
    .small { color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Diagnóstico de portadas pendientes</h1>
  <p>Este informe es read-only. Lista candidatos; no decide ni aplica recuperación.</p>
  <section class="summary">
    <div class="metric"><strong>${diagnosis.statistics.totalBooksAnalyzed}</strong>Libros analizados</div>
    <div class="metric"><strong>${diagnosis.statistics.withoutAnyImage}</strong>Sin ninguna imagen</div>
    <div class="metric"><strong>${diagnosis.statistics.hasStrongCandidate}</strong>Con candidata fuerte</div>
    <div class="metric"><strong>${diagnosis.statistics.hasMultipleCandidates}</strong>Con varias candidatas</div>
    <div class="metric"><strong>${diagnosis.statistics.hasHtmlImages}</strong>Con imagen HTML</div>
    <div class="metric"><strong>${diagnosis.statistics.hasFilenameMatch}</strong>Con match filename</div>
  </section>
  <h2>Top oportunidades</h2>
  <ul>
    ${diagnosis.statistics.topOpportunities
      .map((item) => `<li><code>${escapeHtml(item.rule)}</code>: ${item.recoverableCovers}</li>`)
      .join('')}
  </ul>
  <table id="diagnosis">
    <thead>
      <tr>
        <th data-type="text">Libro</th>
        <th data-type="text">Confianza</th>
        <th data-type="text">Fuente</th>
        <th data-type="number">Puntuación</th>
        <th data-type="number">N candidatos</th>
        <th>Imagen</th>
        <th>Candidato</th>
        <th>Dimensiones</th>
        <th>Coincidencias</th>
        <th>Explicación</th>
      </tr>
    </thead>
    <tbody>
      ${rows.join('')}
    </tbody>
  </table>
  <script>
    document.querySelectorAll('th').forEach((th, index) => {
      th.addEventListener('click', () => {
        const tbody = document.querySelector('#diagnosis tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const type = th.dataset.type || 'text';
        rows.sort((a, b) => {
          const left = a.children[index].dataset.sort || a.children[index].textContent || '';
          const right = b.children[index].dataset.sort || b.children[index].textContent || '';
          return type === 'number' ? Number(right) - Number(left) : left.localeCompare(right);
        });
        rows.forEach((row) => tbody.appendChild(row));
      });
    });
  </script>
</body>
</html>
`;
}

function renderCandidateRow(item: BookCoverDiagnosisItem, candidate: BookCoverDiagnosisCandidate) {
  const dimensions =
    candidate.width && candidate.height
      ? `${candidate.width}x${candidate.height} (${candidate.ratio ?? ''})`
      : '';
  const matches = [
    candidate.slugMatch ? 'slug' : '',
    candidate.titleMatch ? 'titulo' : '',
    candidate.isbnMatch ? 'ISBN' : '',
    candidate.attachmentParentMatch ? 'parent' : '',
    candidate.hasAuthorPhotoSignal ? 'foto_autor' : '',
    candidate.isExternal ? 'externa' : '',
  ].filter(Boolean);

  return `<tr>
  <td data-sort="${escapeHtml(item.title)}"><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.candidateKey)}</code></td>
  <td data-sort="${confidenceWeight(candidate.confidence)}">${escapeHtml(candidate.confidence)}</td>
  <td data-sort="${escapeHtml(candidate.origin)}">${escapeHtml(candidate.origin)}</td>
  <td data-sort="${candidate.score}">${candidate.score}</td>
  <td data-sort="${item.candidateCount}">${item.candidateCount}</td>
  <td>${candidate.url ? `<img src="${escapeHtml(candidate.url)}" alt="">` : ''}</td>
  <td>${escapeHtml(candidate.filename ?? candidate.url ?? '')}<br><span class="small">${candidate.url ? `<a href="${escapeHtml(candidate.url)}">${escapeHtml(candidate.url)}</a>` : ''}</span></td>
  <td>${escapeHtml(dimensions)}</td>
  <td>${escapeHtml(matches.join(' | '))}</td>
  <td>${escapeHtml(candidate.explanation.join(' | '))}</td>
</tr>`;
}

function renderEmptyRow(item: BookCoverDiagnosisItem) {
  return `<tr>
  <td data-sort="${escapeHtml(item.title)}"><strong>${escapeHtml(item.title)}</strong><br><code>${escapeHtml(item.candidateKey)}</code></td>
  <td data-sort="0">none</td>
  <td data-sort="">sin candidato</td>
  <td data-sort="0">0</td>
  <td data-sort="0">0</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td>Sin imagen candidata en las fuentes inspeccionadas.</td>
</tr>`;
}

function confidenceWeight(value: string) {
  if (value === 'high') {
    return 3;
  }

  if (value === 'medium') {
    return 2;
  }

  if (value === 'low') {
    return 1;
  }

  return 0;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
