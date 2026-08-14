import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildAuthorDedupeAudit } from './analyzer';
import {
  applyAuthorDedupeDecision,
  createAuthorDedupeFinalReview,
  createInitialAuthorDedupeDecision,
  restoreAuthorDedupeDecisions,
  selectBiographyForDecision,
  selectCanonicalAuthorForDecision,
  selectPhotoForDecision,
  serializeAuthorDedupeDecisions,
} from './final-review';
import { writeAuthorDedupeFinalReviewOutputs } from './final-review-output';
import type { AuthorDedupeSourceAuthor } from './types';

const firstAuthor: AuthorDedupeSourceAuthor = {
  id: 'author-1',
  name: 'Alonso Cruz León',
  slug: 'alonso-cruz-leon',
  shortBio: null,
  biography: 'Biografía canónica.',
  photoUrl: 'https://example.com/alonso-1.jpg',
  websiteUrl: null,
  instagramUrl: null,
  facebookUrl: null,
  country: null,
  isPublished: true,
  isFeatured: false,
  isArchived: false,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  books: [
    {
      bookId: 'book-1',
      title: 'Libro uno',
      slug: 'libro-uno',
      isPublished: true,
      isArchived: false,
    },
  ],
};

const secondAuthor: AuthorDedupeSourceAuthor = {
  ...firstAuthor,
  id: 'author-2',
  slug: 'alonso-cruz-leon-2',
  biography: 'Biografía alternativa más larga y distinta.',
  photoUrl: 'https://example.com/alonso-2.jpg',
  sortOrder: 12,
  createdAt: '2026-01-02T00:00:00.000Z',
  books: [
    {
      bookId: 'book-2',
      title: 'Libro dos',
      slug: 'libro-dos',
      isPublished: true,
      isArchived: false,
    },
  ],
};

describe('author dedupe final review', () => {
  it('creates proposal-only decisions with preselected canonical and merge ids', () => {
    const audit = buildAuthorDedupeAudit([firstAuthor, secondAuthor], '2026-08-11T00:00:00.000Z');
    const decision = createInitialAuthorDedupeDecision(audit.groups[0]);

    expect(decision).toMatchObject({
      groupId: 'author-duplicate-001',
      decision: null,
      canonicalAuthorId: 'author-1',
      mergeAuthorIds: ['author-2'],
      reviewed: false,
    });
    expect(decision.fieldConflicts).toEqual(expect.arrayContaining(['photoUrl', 'biography']));
  });

  it('allows changing canonical, photo, biography and decision without applying changes', () => {
    const audit = buildAuthorDedupeAudit([firstAuthor, secondAuthor], '2026-08-11T00:00:00.000Z');
    const group = audit.groups[0];
    const initial = createInitialAuthorDedupeDecision(group);
    const changedCanonical = selectCanonicalAuthorForDecision(group, initial, 'author-2');
    const changedPhoto = selectPhotoForDecision(changedCanonical, secondAuthor.photoUrl);
    const changedBiography = selectBiographyForDecision(changedPhoto, secondAuthor.biography);
    const approved = applyAuthorDedupeDecision(changedBiography, 'merge');

    expect(approved.canonicalAuthorId).toBe('author-2');
    expect(approved.mergeAuthorIds).toEqual(['author-1']);
    expect(approved.selectedFields.photoUrl).toBe(secondAuthor.photoUrl);
    expect(approved.selectedFields.biography).toBe(secondAuthor.biography);
    expect(approved.decision).toBe('merge');
  });

  it('serializes and restores imported decisions safely', () => {
    const audit = buildAuthorDedupeAudit([firstAuthor, secondAuthor], '2026-08-11T00:00:00.000Z');
    const initial = createInitialAuthorDedupeDecision(audit.groups[0]);
    const decision = {
      ...applyAuthorDedupeDecision(selectPhotoForDecision(initial, null), 'manual_review'),
      notes: 'Revisar fotos antes del merge.',
      reviewed: true,
    };
    const serialized = serializeAuthorDedupeDecisions([decision], '2026-08-11T00:00:00.000Z');
    const restored = restoreAuthorDedupeDecisions(audit, serialized);

    expect(serialized.statistics).toMatchObject({
      totalGroups: 1,
      manualReview: 1,
      reviewed: 1,
      photoConflicts: 1,
      biographyConflicts: 1,
    });
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      decision: 'manual_review',
      selectedFields: expect.objectContaining({ photoUrl: null }),
      notes: 'Revisar fotos antes del merge.',
      reviewed: true,
    });
  });

  it('keeps HIGH, LIKELY and MANUAL_REVIEW groups as unapproved proposals', () => {
    const highAudit = buildAuthorDedupeAudit(
      [
        { ...firstAuthor, biography: null, photoUrl: null },
        { ...secondAuthor, biography: null, photoUrl: null },
      ],
      '2026-08-11T00:00:00.000Z',
    );
    const likelyAudit = buildAuthorDedupeAudit(
      [firstAuthor, secondAuthor],
      '2026-08-11T00:00:00.000Z',
    );
    const manualAudit = buildAuthorDedupeAudit(
      [
        firstAuthor,
        {
          ...secondAuthor,
          slug: 'alonso-cruz-leon-editorial-la-rueca',
        },
      ],
      '2026-08-11T00:00:00.000Z',
    );

    expect(createInitialAuthorDedupeDecision(highAudit.groups[0])).toMatchObject({
      classification: 'HIGH_CONFIDENCE_DUPLICATE',
      decision: null,
    });
    expect(createInitialAuthorDedupeDecision(likelyAudit.groups[0])).toMatchObject({
      classification: 'LIKELY_DUPLICATE',
      decision: null,
    });
    expect(createInitialAuthorDedupeDecision(manualAudit.groups[0])).toMatchObject({
      classification: 'MANUAL_REVIEW',
      decision: null,
    });
  });

  it('writes interactive HTML and initial decisions JSON', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'author-dedupe-review-'));
    const audit = buildAuthorDedupeAudit([firstAuthor, secondAuthor], '2026-08-11T00:00:00.000Z');
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, 'author-duplicate-audit.json'),
      `${JSON.stringify(audit, null, 2)}\n`,
      'utf8',
    );
    const { review } = await createAuthorDedupeFinalReview({
      outputDirectory: directory,
      generatedAt: '2026-08-11T00:00:00.000Z',
    });
    const files = await writeAuthorDedupeFinalReviewOutputs({
      audit,
      review,
      outputDirectory: directory,
    });
    const html = await readFile(path.join(directory, 'author-dedupe-final-review.html'), 'utf8');
    const decisions = await readFile(path.join(directory, 'author-dedupe-decisions.json'), 'utf8');

    expect(files.map((file) => path.basename(file))).toEqual([
      'author-dedupe-decisions.json',
      'author-dedupe-final-review.html',
    ]);
    expect(html).toContain('localStorage');
    expect(html).toContain('EXPORTAR DECISIONES');
    expect(html).toContain('IMPORTAR DECISIONES');
    expect(html).toContain('data-canonical-option="author-2"');
    expect(html).toContain('data-photo-option="https://example.com/alonso-2.jpg"');
    expect(html).toContain('Libro uno');
    expect(decisions).toContain('"decision": null');
  });
});
