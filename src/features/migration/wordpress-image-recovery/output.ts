import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ImageRecoveryPlan, RecoveryPlanItem } from './types';

export async function writeImageRecoveryOutputs(plan: ImageRecoveryPlan, outputDirectory: string) {
  await mkdir(outputDirectory, { recursive: true });

  const technicalRetries = plan.items.filter((item) => item.category === 'technical_retry');
  const ambiguousImages = plan.items.filter((item) => item.category === 'ambiguous');
  const missingImages = plan.items.filter((item) => item.category === 'no_candidate');
  const files: Array<[string, unknown]> = [
    ['recovery-plan.json', plan],
    ['technical-retries.json', technicalRetries],
    ['ambiguous-images.json', ambiguousImages],
    ['missing-images.json', missingImages],
    ['recovery-result.json', plan.result],
    ['manifest.json', plan.manifest],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );
  await writeFileAtomic(
    path.join(outputDirectory, 'recovery-preview.html'),
    renderPreviewHtml(plan.items),
  );

  return [
    ...files.map(([filename]) => path.join(outputDirectory, filename)),
    path.join(outputDirectory, 'recovery-preview.html'),
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

function renderPreviewHtml(items: RecoveryPlanItem[]) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Image Recovery Preview</title>
  <style>
    body { margin: 24px; background: #f7f7f5; color: #111; font-family: system-ui, sans-serif; }
    h1 { font-family: Georgia, serif; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 8px; border-bottom: 1px solid #e6e6e2; text-align: left; vertical-align: top; }
    img { width: 72px; height: 96px; object-fit: cover; border: 1px solid #ddd; background: #f3f3f0; }
    code { padding: 2px 4px; border-radius: 4px; background: #eee; }
  </style>
</head>
<body>
  <h1>Image Recovery Preview</h1>
  <table>
    <thead>
      <tr>
        <th>Entidad</th>
        <th>Titulo/nombre</th>
        <th>Candidato</th>
        <th>Imagen</th>
        <th>URL</th>
        <th>Origen</th>
        <th>Dimensiones</th>
        <th>Señales</th>
        <th>Confianza</th>
        <th>Decisión</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(renderPreviewRow).join('')}
    </tbody>
  </table>
</body>
</html>
`;
}

function renderPreviewRow(item: RecoveryPlanItem) {
  const candidate = item.candidate;
  const dimensions =
    candidate?.width && candidate.height ? `${candidate.width}x${candidate.height}` : '';

  return `<tr>
  <td><code>${escapeHtml(item.entityType)}</code><br>${escapeHtml(item.candidateKey)}</td>
  <td>${escapeHtml(item.title)}</td>
  <td>${escapeHtml(candidate?.filename ?? candidate?.title ?? '')}</td>
  <td>${candidate?.url ? `<img src="${escapeHtml(candidate.url)}" alt="">` : ''}</td>
  <td>${candidate?.url ? `<a href="${escapeHtml(candidate.url)}">${escapeHtml(candidate.url)}</a>` : ''}</td>
  <td>${escapeHtml(candidate?.origin ?? '')}</td>
  <td>${escapeHtml(dimensions)}</td>
  <td>${escapeHtml(candidate?.signals.join(' | ') ?? item.reasons.join(' | '))}</td>
  <td>${escapeHtml(item.confidence)}</td>
  <td><code>${escapeHtml(item.category)}</code><br>${escapeHtml(item.decision)}</td>
</tr>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
