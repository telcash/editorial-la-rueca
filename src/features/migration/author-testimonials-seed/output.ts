import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  AuthorTestimonialsSeedConflict,
  AuthorTestimonialsSeedPlan,
  AuthorTestimonialsSeedResult,
} from './types';

export async function writeAuthorTestimonialsSeedOutputs(
  outputDirectory: string,
  plan: AuthorTestimonialsSeedPlan,
  result: AuthorTestimonialsSeedResult,
) {
  await mkdir(outputDirectory, { recursive: true });

  const files: Array<[string, unknown]> = [
    ['review.json', plan],
    ['conflicts.json', plan.conflicts],
    ['result.json', result],
  ];

  await Promise.all(
    files.map(([filename, data]) => writeJsonAtomic(path.join(outputDirectory, filename), data)),
  );
  await writeFileAtomic(path.join(outputDirectory, 'review.html'), renderReviewHtml(plan));

  return [
    ...files.map(([filename]) => path.join(outputDirectory, filename)),
    path.join(outputDirectory, 'review.html'),
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

function renderReviewHtml(plan: AuthorTestimonialsSeedPlan) {
  const initialDecisions = plan.items.map((item) => ({
    testimonialKey: item.testimonialKey,
    sourceName: item.sourceName,
    selectedAuthorId: item.input.authorId,
    selectedBookId: item.input.bookId,
    decision: null,
    notes: '',
    reviewed: false,
  }));

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revisión editorial de testimonios</title>
  <style>
    :root { color-scheme: light; --red: #e02b20; --ink: #151515; --muted: #666; --line: #dedbd5; --paper: #fff; --soft: #f7f5f1; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--soft); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    header { position: sticky; top: 0; z-index: 10; border-bottom: 1px solid var(--line); background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(10px); }
    main, .header-inner { max-width: 1280px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { font-family: Georgia, serif; margin: 0; }
    h1 { font-size: clamp(1.8rem, 4vw, 3rem); }
    h2 { font-size: 1.25rem; }
    button, select, textarea { font: inherit; }
    button { cursor: pointer; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 9px 12px; font-weight: 700; }
    button.primary, button.active { border-color: var(--red); background: var(--red); color: #fff; }
    button.secondary { border-color: var(--red); color: var(--red); }
    select, textarea { width: 100%; border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 9px 10px; }
    textarea { min-height: 72px; resize: vertical; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 18px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 18px; }
    .stat { padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
    .stat strong { display: block; font-size: 0.78rem; color: var(--muted); text-transform: uppercase; }
    .stat span { font-size: 1.3rem; font-weight: 800; }
    .cards { display: grid; gap: 18px; padding-block: 22px; }
    .card { border: 1px solid var(--line); border-radius: 10px; background: var(--paper); box-shadow: 0 8px 28px rgba(20, 20, 20, 0.05); overflow: hidden; }
    .card-header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--line); }
    .card-body { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr); gap: 18px; padding: 16px; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 9px; background: #f1efeb; color: #333; font-size: 0.78rem; font-weight: 800; }
    .badge.exact { background: #dcfce7; color: #166534; }
    .badge.likely { background: #fef3c7; color: #92400e; }
    .badge.ambiguous, .badge.not-found { background: #fee2e2; color: #991b1b; }
    .quote { margin: 0; padding: 14px; border-left: 4px solid var(--red); background: #fafafa; line-height: 1.55; }
    .grid { display: grid; gap: 12px; }
    .candidate-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
    .candidate { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 10px; align-items: center; width: 100%; text-align: left; }
    .candidate img, .avatar { width: 54px; height: 54px; border-radius: 999px; object-fit: cover; background: #ebe7df; }
    .candidate.selected { outline: 3px solid var(--red); outline-offset: 2px; }
    .muted { color: var(--muted); }
    .small { font-size: 0.86rem; }
    .decision-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .hidden { display: none; }
    .file-input { max-width: 320px; }
    @media (max-width: 860px) {
      .card-body { grid-template-columns: 1fr; }
      main, .header-inner { padding-inline: 14px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <h1>Revisión editorial de testimonios</h1>
      <p class="muted">Selecciona el autor real y, opcionalmente, el libro asociado antes de autorizar un futuro apply.</p>
      <div class="toolbar" aria-label="Acciones de revisión">
        <button class="primary" type="button" data-export>Exportar decisiones</button>
        <label>
          <span class="badge">Importar decisiones</span>
          <input class="file-input" type="file" accept="application/json" data-import>
        </label>
      </div>
      <div class="stats" aria-live="polite">
        <div class="stat"><strong>Total</strong><span data-stat="total">0</span></div>
        <div class="stat"><strong>Aprobados</strong><span data-stat="approved">0</span></div>
        <div class="stat"><strong>Pendientes</strong><span data-stat="pending">0</span></div>
        <div class="stat"><strong>Skip</strong><span data-stat="skip">0</span></div>
        <div class="stat"><strong>Manual review</strong><span data-stat="manual_review">0</span></div>
      </div>
      <div class="toolbar" aria-label="Filtros">
        <button type="button" class="active" data-filter="all">Todos</button>
        <button type="button" data-filter="pending">Pendientes</button>
        <button type="button" data-filter="exact">Exactos</button>
        <button type="button" data-filter="likely">Probables</button>
        <button type="button" data-filter="ambiguous">Ambiguos</button>
        <button type="button" data-filter="not-found">No encontrados</button>
      </div>
    </div>
  </header>
  <main>
    <section aria-label="Resumen técnico">
    <div class="stats">
      ${stat('Testimonios', plan.summary.total)}
      ${stat('Autores exactos', plan.summary.exactAuthorMatches)}
      ${stat('Autores likely', plan.summary.likelyAuthorMatches)}
      ${stat('Autores ambiguos', plan.summary.ambiguousAuthorMatches)}
      ${stat('Autores no encontrados', plan.summary.authorsNotFound)}
      ${stat('Libros exactos', plan.summary.exactBookMatches)}
      ${stat('Libros likely', plan.summary.likelyBookMatches)}
      ${stat('Libros ambiguos', plan.summary.ambiguousBookMatches)}
      ${stat('Libros no encontrados', plan.summary.booksNotFound)}
      ${stat('Ready', plan.summary.readyToInsert)}
      ${stat('Manual', plan.summary.manualReview)}
      ${stat('Blockers', plan.summary.blockers)}
      ${stat('Tabla disponible', plan.summary.tableExists)}
    </div>
    </section>
    <section class="cards" aria-label="Testimonios">
      ${plan.items
        .map((item) => renderReviewCard(item, plan.availableAuthors, plan.availableBooks))
        .join('')}
    </section>
    <section>
      <h2>Conflictos</h2>
    ${renderConflicts(plan.conflicts)}
    </section>
  </main>
  <script type="application/json" id="review-data">${safeScriptJson({
    items: plan.items,
    authors: plan.availableAuthors,
    books: plan.availableBooks,
    initialDecisions,
  })}</script>
  <script>
    const data = JSON.parse(document.getElementById('review-data').textContent);
    const storageKey = 'author-testimonials-seed-decisions-v1';
    let decisions = loadDecisions();
    let currentFilter = 'all';

    function loadDecisions() {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return mergeDecisions(JSON.parse(stored));
        } catch {
          return data.initialDecisions;
        }
      }
      return data.initialDecisions;
    }

    function mergeDecisions(imported) {
      const importedByKey = new Map(Array.isArray(imported) ? imported.map((item) => [item.testimonialKey, item]) : []);
      return data.initialDecisions.map((initial) => ({
        ...initial,
        ...(importedByKey.get(initial.testimonialKey) || {}),
      }));
    }

    function saveDecisions() {
      localStorage.setItem(storageKey, JSON.stringify(decisions));
      renderState();
    }

    function getDecision(key) {
      return decisions.find((decision) => decision.testimonialKey === key);
    }

    function updateDecision(key, patch) {
      decisions = decisions.map((decision) =>
        decision.testimonialKey === key ? { ...decision, ...patch } : decision,
      );
      saveDecisions();
    }

    function renderState() {
      const approved = decisions.filter((decision) => decision.decision === 'approved').length;
      const skip = decisions.filter((decision) => decision.decision === 'skip').length;
      const manual = decisions.filter((decision) => decision.decision === 'manual_review').length;
      const pending = decisions.length - approved - skip - manual;
      document.querySelector('[data-stat="total"]').textContent = String(decisions.length);
      document.querySelector('[data-stat="approved"]').textContent = String(approved);
      document.querySelector('[data-stat="pending"]').textContent = String(pending);
      document.querySelector('[data-stat="skip"]').textContent = String(skip);
      document.querySelector('[data-stat="manual_review"]').textContent = String(manual);

      for (const card of document.querySelectorAll('[data-card]')) {
        const decision = getDecision(card.dataset.key);
        const isPending = !decision || decision.decision === null;
        const shouldShow =
          currentFilter === 'all' ||
          (currentFilter === 'pending' && isPending) ||
          card.dataset.group === currentFilter;
        card.classList.toggle('hidden', !shouldShow);

        const authorSelect = card.querySelector('[data-author-select]');
        const bookSelect = card.querySelector('[data-book-select]');
        const notes = card.querySelector('[data-notes]');
        if (authorSelect) authorSelect.value = decision?.selectedAuthorId || '';
        if (bookSelect) bookSelect.value = decision?.selectedBookId || '';
        if (notes) notes.value = decision?.notes || '';

        for (const button of card.querySelectorAll('[data-candidate-author]')) {
          button.classList.toggle('selected', button.dataset.candidateAuthor === decision?.selectedAuthorId);
        }
        for (const button of card.querySelectorAll('[data-decision]')) {
          button.classList.toggle('active', button.dataset.decision === String(decision?.decision));
        }
      }
    }

    document.addEventListener('click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;

      if (target.dataset.filter) {
        currentFilter = target.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button === target));
        renderState();
        return;
      }

      if (target.dataset.export !== undefined) {
        const blob = new Blob([JSON.stringify(decisions, null, 2) + '\\n'], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'author-testimonials-seed-decisions.json';
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const card = target.closest('[data-card]');
      if (!card) return;

      if (target.dataset.candidateAuthor) {
        updateDecision(card.dataset.key, {
          selectedAuthorId: target.dataset.candidateAuthor,
          reviewed: true,
        });
        return;
      }

      if (target.dataset.decision) {
        const selectedDecision = target.dataset.decision === 'null' ? null : target.dataset.decision;
        updateDecision(card.dataset.key, {
          decision: selectedDecision,
          reviewed: selectedDecision !== null,
        });
      }
    });

    document.addEventListener('change', (event) => {
      const target = event.target;
      const card = target.closest ? target.closest('[data-card]') : null;

      if (target.matches('[data-import]')) {
        const file = target.files?.[0];
        if (!file) return;
        file.text().then((content) => {
          decisions = mergeDecisions(JSON.parse(content));
          saveDecisions();
        });
        return;
      }

      if (!card) return;

      if (target.matches('[data-author-select]')) {
        updateDecision(card.dataset.key, {
          selectedAuthorId: target.value || null,
          reviewed: true,
        });
      }

      if (target.matches('[data-book-select]')) {
        updateDecision(card.dataset.key, {
          selectedBookId: target.value || null,
          reviewed: true,
        });
      }
    });

    document.addEventListener('input', (event) => {
      const target = event.target;
      const card = target.closest ? target.closest('[data-card]') : null;
      if (card && target.matches('[data-notes]')) {
        updateDecision(card.dataset.key, { notes: target.value });
      }
    });

    renderState();
  </script>
</body>
</html>`;
}

function stat(label: string, value: number | boolean) {
  return `<div class="stat"><strong>${escapeHtml(label)}</strong><span>${String(value)}</span></div>`;
}

function renderReviewCard(
  planItem: AuthorTestimonialsSeedPlan['items'][number],
  availableAuthors: AuthorTestimonialsSeedPlan['availableAuthors'],
  availableBooks: AuthorTestimonialsSeedPlan['availableBooks'],
) {
  const group = getFilterGroup(planItem.authorMatch.status);

  return `<article class="card" data-card data-key="${escapeHtml(planItem.testimonialKey)}" data-group="${group}">
    <div class="card-header">
      <div>
        <span class="badge ${group}">${escapeHtml(planItem.authorMatch.status)}</span>
        <span class="badge">${escapeHtml(planItem.status)}</span>
      </div>
      <strong>#${planItem.index} ${escapeHtml(planItem.sourceName)}</strong>
    </div>
    <div class="card-body">
      <div class="grid">
        <blockquote class="quote">${escapeHtml(planItem.quote)}</blockquote>
        <div>
          <h3>Propuestas de autor</h3>
          <div class="candidate-list">${renderAuthorCandidateButtons(planItem)}</div>
        </div>
      </div>
      <div class="grid">
        <label>
          Autor existente
          <select data-author-select>
            <option value="">Sin autor seleccionado</option>
            ${renderAuthorOptions(availableAuthors, planItem.input.authorId)}
          </select>
        </label>
        <label>
          Libro asociado opcional
          <select data-book-select>
            <option value="">Sin libro asociado</option>
            ${renderBookOptions(availableBooks, planItem.input.bookId)}
          </select>
        </label>
        ${renderSuggestedBook(planItem)}
        <label>
          Notas editoriales
          <textarea data-notes placeholder="Anota dudas o criterios de decisión"></textarea>
        </label>
        <div class="decision-actions" aria-label="Decisión editorial">
          <button type="button" class="primary" data-decision="approved">Aprobar</button>
          <button type="button" data-decision="skip">Skip</button>
          <button type="button" data-decision="manual_review">Manual review</button>
          <button type="button" data-decision="null">Pendiente</button>
        </div>
      </div>
    </div>
  </article>`;
}

function renderAuthorCandidateButtons(planItem: AuthorTestimonialsSeedPlan['items'][number]) {
  if (planItem.authorMatch.candidates.length === 0) {
    return '<p class="muted">Sin candidatos automáticos. Usa el selector de autores existentes.</p>';
  }

  return planItem.authorMatch.candidates
    .map(
      (
        candidate,
      ) => `<button class="candidate" type="button" data-candidate-author="${escapeHtml(candidate.id)}">
        ${candidate.photoUrl ? `<img src="${escapeHtml(candidate.photoUrl)}" alt="">` : '<span class="avatar" aria-hidden="true"></span>'}
        <span>
          <strong>${escapeHtml(candidate.name)}</strong><br>
          <span class="small muted">${escapeHtml(candidate.slug)} · ${candidate.confidence.toFixed(2)}</span><br>
          <span class="small">${escapeHtml(candidate.books.map((book) => book.title).join(' · ') || 'Sin libros asociados')}</span>
        </span>
      </button>`,
    )
    .join('');
}

function renderAuthorOptions(
  authors: AuthorTestimonialsSeedPlan['availableAuthors'],
  selectedAuthorId: string | null,
) {
  return authors
    .map(
      (author) =>
        `<option value="${escapeHtml(author.id)}" ${author.id === selectedAuthorId ? 'selected' : ''}>${escapeHtml(author.name)} · ${escapeHtml(author.slug)}${author.books.length ? ` · ${escapeHtml(author.books.map((book) => book.title).join(' / '))}` : ''}</option>`,
    )
    .join('');
}

function renderBookOptions(
  books: AuthorTestimonialsSeedPlan['availableBooks'],
  selectedBookId: string | null,
) {
  return books
    .map(
      (book) =>
        `<option value="${escapeHtml(book.id)}" ${book.id === selectedBookId ? 'selected' : ''}>${escapeHtml(book.title)} · ${escapeHtml(book.slug)}${book.authors.length ? ` · ${escapeHtml(book.authors.map((author) => author.name).join(', '))}` : ''}</option>`,
    )
    .join('');
}

function renderSuggestedBook(planItem: AuthorTestimonialsSeedPlan['items'][number]) {
  if (!planItem.suggestedBookTitle) {
    return '<p class="small muted">Este testimonio no trae libro sugerido.</p>';
  }

  if (!planItem.bookMatch.selectedBook) {
    return `<p class="small muted">Libro sugerido sin selección automática: ${escapeHtml(planItem.suggestedBookTitle)}</p>`;
  }

  return `<p class="small muted">Libro sugerido: <strong>${escapeHtml(planItem.bookMatch.selectedBook.title)}</strong> · ${escapeHtml(planItem.bookMatch.selectedBook.authors.map((author) => author.name).join(', '))}</p>`;
}

function getFilterGroup(
  status: AuthorTestimonialsSeedPlan['items'][number]['authorMatch']['status'],
) {
  if (status === 'EXACT_AUTHOR_MATCH') {
    return 'exact';
  }

  if (status === 'LIKELY_AUTHOR_MATCH') {
    return 'likely';
  }

  if (status === 'AMBIGUOUS_AUTHOR_MATCH') {
    return 'ambiguous';
  }

  return 'not-found';
}

function renderConflicts(conflicts: AuthorTestimonialsSeedConflict[]) {
  if (conflicts.length === 0) {
    return '<p>Sin conflictos.</p>';
  }

  return `<table><tbody>${conflicts
    .map(
      (conflict) => `<tr>
        <td>${escapeHtml(conflict.severity)}</td>
        <td>${escapeHtml(conflict.code)}</td>
        <td>${escapeHtml(conflict.sourceName)}</td>
        <td>${escapeHtml(conflict.message)}</td>
        <td>${escapeHtml(conflict.details)}</td>
      </tr>`,
    )
    .join('')}</tbody></table>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
