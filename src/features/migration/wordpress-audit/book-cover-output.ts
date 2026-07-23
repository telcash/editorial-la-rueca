import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { toCsv } from './csv';
import type { BookCoverAnalysis, BookCoverBestMatch } from './book-cover-analysis';
import { getPilotBookCoverMatches } from './book-cover-analysis';

const candidatesHeaders = [
  'bookCandidateKey',
  'bookTitle',
  'sourceWpPostId',
  'authorNames',
  'attachmentId',
  'attachmentUrl',
  'filename',
  'attachmentTitle',
  'width',
  'height',
  'aspectRatio',
  'score',
  'confidence',
  'reasons',
];

export async function writeBookCoverAnalysisOutputs(params: {
  analysis: BookCoverAnalysis;
  auditDirectory: string;
  pilotDirectory: string;
}) {
  await Promise.all([
    mkdir(params.auditDirectory, { recursive: true }),
    mkdir(params.pilotDirectory, { recursive: true }),
  ]);

  const candidatesPath = path.join(params.auditDirectory, 'book-cover-candidates.csv');
  const bestMatchPath = path.join(params.auditDirectory, 'book-cover-best-match.json');
  const reviewHtmlPath = path.join(params.pilotDirectory, 'book-cover-review.html');

  await Promise.all([
    writeFile(candidatesPath, `${toCsv(params.analysis.candidates, candidatesHeaders)}\n`, 'utf8'),
    writeFile(bestMatchPath, `${JSON.stringify(params.analysis.bestMatches, null, 2)}\n`, 'utf8'),
    writeFile(reviewHtmlPath, renderPilotBookCoverReviewHtml(params.analysis), 'utf8'),
  ]);

  return {
    candidatesPath,
    bestMatchPath,
    reviewHtmlPath,
  };
}

export function renderPilotBookCoverReviewHtml(analysis: BookCoverAnalysis) {
  const matches = getPilotBookCoverMatches(analysis);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Revision de portadas piloto</title>
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111;
        background: #f6f4f1;
      }

      body {
        margin: 0;
        padding: 32px;
      }

      main {
        max-width: 1180px;
        margin: 0 auto;
      }

      h1,
      h2,
      h3,
      p {
        margin-top: 0;
      }

      .book {
        margin: 0 0 32px;
        padding: 24px;
        border: 1px solid #ddd8d2;
        border-radius: 8px;
        background: #fff;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .candidate {
        border: 1px solid #e3ded8;
        border-radius: 8px;
        overflow: hidden;
        background: #fbfaf8;
      }

      .candidate img {
        display: block;
        width: 100%;
        aspect-ratio: 2 / 3;
        object-fit: contain;
        background: #eeeae4;
      }

      .candidate-body {
        padding: 12px;
      }

      .meta {
        color: #5d5853;
        font-size: 13px;
        line-height: 1.45;
      }

      .score {
        display: inline-block;
        margin: 0 0 8px;
        padding: 4px 8px;
        border-radius: 999px;
        background: #e02b20;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Revision visual de posibles portadas piloto</h1>
      <p>Analisis read-only. No aplica decisiones ni actualiza datos.</p>
      ${matches.map(renderBookSection).join('\n')}
    </main>
  </body>
</html>
`;
}

function renderBookSection(match: BookCoverBestMatch) {
  const candidates = [match.bestCandidate, ...match.alternatives].filter(
    (candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate),
  );

  return `<section class="book">
  <h2>${escapeHtml(match.bookTitle)}</h2>
  <p class="meta">Confianza mejor candidato: ${escapeHtml(match.confidence)}</p>
  ${
    candidates.length === 0
      ? '<p>No hay candidatos suficientes para este libro.</p>'
      : `<div class="grid">${candidates.map(renderCandidate).join('\n')}</div>`
  }
</section>`;
}

function renderCandidate(candidate: NonNullable<BookCoverBestMatch['bestCandidate']>) {
  return `<article class="candidate">
  <img src="${escapeHtml(candidate.attachmentUrl)}" alt="Candidato de portada para ${escapeHtml(candidate.bookTitle)}" loading="lazy" />
  <div class="candidate-body">
    <span class="score">${candidate.score} · ${escapeHtml(candidate.confidence)}</span>
    <h3>${escapeHtml(candidate.filename || candidate.attachmentTitle || candidate.attachmentId)}</h3>
    <p class="meta">Autor/es: ${escapeHtml(candidate.authorNames)}</p>
    <p class="meta">Attachment ${escapeHtml(candidate.attachmentId)} · ${escapeHtml(candidate.width ?? '')} x ${escapeHtml(candidate.height ?? '')}</p>
    <p class="meta">${escapeHtml(candidate.reasons)}</p>
    <p class="meta"><a href="${escapeHtml(candidate.attachmentUrl)}" target="_blank" rel="noreferrer">Abrir imagen original</a></p>
  </div>
</article>`;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
