import { describe, expect, it } from 'vitest';

import { resolveMassBlockers } from './resolution';
import type {
  PilotAttachmentCandidate,
  PilotAuditData,
  PilotAuthorCandidate,
  PilotBookCandidate,
  PilotRelationshipCandidate,
} from '@/features/migration/wordpress-pilot/types';
import type {
  MassAuthorImagePlan,
  MassAuthorPlan,
  MassBookCoverPlan,
  MassBookPlan,
  MassConflict,
  MassRelationPlan,
} from './types';

function createAuthor(overrides: Partial<MassAuthorPlan> = {}): MassAuthorPlan {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      name: 'Juan Perez',
      slug: 'juan-perez',
      shortBio: null,
      biography: null,
      photoUrl: null,
      websiteUrl: null,
      instagramUrl: null,
      facebookUrl: null,
      country: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {
      oldUrl: 'https://example.com/autor/juan-perez/',
      rawReview: '<p>Sinopsis</p>',
      classification: 'legacy_author_book_combined',
      possibleDuplicateGroup: '',
    },
    ...overrides,
  };
}

function createBook(overrides: Partial<MassBookPlan> = {}): MassBookPlan {
  return {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    input: {
      title: 'Libro Uno',
      subtitle: null,
      slug: 'libro-uno',
      description: '<p>Sinopsis</p>',
      excerpt: 'Sinopsis',
      coverUrl: null,
      originalPublicationDate: null,
      language: null,
      isFeatured: false,
      isPublished: false,
      sortOrder: 0,
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      authorIds: ['00000000-0000-4000-8000-000000000001'],
      categoryIds: [],
      editions: [],
    },
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {},
    sourceMetadata: {
      oldUrl: 'https://example.com/autor/juan-perez/',
    },
    ...overrides,
  };
}

function createRelation(overrides: Partial<MassRelationPlan> = {}): MassRelationPlan {
  return {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    action: 'AUTO_CREATE',
    status: 'READY',
    confidence: 'high',
    reason: 'fixture',
    blockingReasons: [],
    warnings: [],
    resolvedDependencies: {
      bookCandidateKey: 'book:uno',
      authorCandidateKey: 'author:1',
    },
    ...overrides,
  };
}

function createImage(overrides: Partial<MassAuthorImagePlan> = {}): MassAuthorImagePlan {
  return {
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    attachmentId: '10',
    filename: 'foto-juan.jpg',
    url: 'https://example.com/foto-juan.jpg',
    status: 'AUTO_UPLOAD',
    confidence: 'high',
    score: 90,
    reasons: ['fixture'],
    ...overrides,
  };
}

function createAuditAuthor(overrides: Partial<PilotAuthorCandidate> = {}): PilotAuthorCandidate {
  return {
    candidateKey: 'author:1',
    sourceWpPostId: '1',
    name: 'Juan Perez',
    normalizedName: 'juan perez',
    slug: 'juan-perez',
    normalizedSlug: 'juan-perez',
    oldUrl: 'https://example.com/autor/juan-perez/',
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    bioCandidate: '',
    thumbnailId: '10',
    thumbnailUrl: 'https://example.com/foto-juan.jpg',
    imageFieldId: '',
    imageFieldUrl: '',
    status: 'publish',
    classification: 'legacy_author_book_combined',
    classificationReasons: 'tf_libro poblado',
    possibleDuplicateGroup: '',
    reviewLikelyType: 'book_synopsis',
    reviewConfidence: 'medium',
    yoastMetaTitle: '',
    yoastMetaDescription: '',
    canonicalUrl: '',
    ...overrides,
  };
}

function createAuditBook(overrides: Partial<PilotBookCandidate> = {}): PilotBookCandidate {
  return {
    candidateKey: 'book:uno',
    sourceWpPostId: '1',
    title: 'Libro Uno',
    normalizedTitle: 'libro uno',
    sourceAuthorTitle: 'Juan Perez',
    sourceAuthorSlug: 'juan-perez',
    sourceOldUrl: 'https://example.com/autor/juan-perez/',
    rawReview: '<p>Sinopsis</p>',
    plainTextPreview: 'Sinopsis',
    videoId: '',
    thumbnailId: '',
    thumbnailUrl: '',
    duplicateGroupId: '',
    ...overrides,
  };
}

function createAuditRelation(
  overrides: Partial<PilotRelationshipCandidate> = {},
): PilotRelationshipCandidate {
  return {
    bookCandidateKey: 'book:uno',
    authorCandidateKey: 'author:1',
    sourceWpPostId: '1',
    confidence: 'high',
    reason: 'fixture',
    ...overrides,
  };
}

function createAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '10',
    title: 'Foto Juan',
    slug: 'foto-juan',
    url: 'https://example.com/foto-juan.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '800',
    height: '800',
    attachedFile: 'foto-juan.jpg',
    ...overrides,
  };
}

function createInput(
  overrides: {
    authors?: MassAuthorPlan[];
    books?: MassBookPlan[];
    relations?: MassRelationPlan[];
    conflicts?: MassConflict[];
    authorImages?: MassAuthorImagePlan[];
    bookCovers?: MassBookCoverPlan[];
    audit?: Partial<PilotAuditData>;
  } = {},
) {
  const authors = overrides.authors ?? [createAuthor()];
  const books = overrides.books ?? [createBook()];
  const relations = overrides.relations ?? [createRelation()];
  const auditAuthors = authors.map((author) =>
    createAuditAuthor({
      candidateKey: author.candidateKey,
      sourceWpPostId: author.sourceWpPostId,
      name: author.input.name,
      slug: author.input.slug,
      normalizedName: author.input.name.toLowerCase(),
      classification: String(author.sourceMetadata.classification ?? 'legacy_author_book_combined'),
      possibleDuplicateGroup: String(author.sourceMetadata.possibleDuplicateGroup ?? ''),
    }),
  );
  const auditBooks = books.map((book) =>
    createAuditBook({
      candidateKey: book.candidateKey,
      sourceWpPostId: book.sourceWpPostId,
      title: book.input.title,
      normalizedTitle: book.input.title.toLowerCase(),
    }),
  );

  return {
    generatedAt: '2026-07-23T00:00:00.000Z',
    mass: {
      authors,
      books,
      relations,
      conflicts: overrides.conflicts ?? [],
      authorImages:
        overrides.authorImages ??
        authors.map((author) =>
          createImage({
            authorCandidateKey: author.candidateKey,
            sourceWpPostId: author.sourceWpPostId,
          }),
        ),
      bookCovers: overrides.bookCovers ?? [],
    },
    audit: {
      sample: {
        generatedAt: '2026-07-23T00:00:00.000Z',
        cases: [],
      },
      authors: auditAuthors,
      books: auditBooks,
      relationships: relations.map((relation) =>
        createAuditRelation({
          bookCandidateKey: relation.bookCandidateKey,
          authorCandidateKey: relation.authorCandidateKey,
          sourceWpPostId: relation.sourceWpPostId,
        }),
      ),
      attachments: [createAttachment()],
      issues: [],
      decisions: {},
      ...overrides.audit,
    },
  };
}

describe('resolveMassBlockers', () => {
  it('proposes a high-confidence merge for same name and numeric slug suffixes', () => {
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({
            candidateKey: 'author:1',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, slug: 'juan-perez-2' },
            status: 'BLOCKED',
            action: 'REQUIRES_DUPLICATE_DECISION',
            blockingReasons: ['Grupo duplicado sin decision: possible-author:juan perez'],
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
        ],
      }),
    );

    expect(result.authorDuplicateReview.groups[0]?.proposal).toBe('MERGE_HIGH_CONFIDENCE');
  });

  it('keeps similar names with conflicting biographies out of automatic merge', () => {
    const base = createAuthor();
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({
            candidateKey: 'author:1',
            input: { ...base.input, name: 'Juan Perez' },
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'author_only_candidate',
            },
          }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: {
              ...base.input,
              name: 'Juan Perez Garcia',
              slug: 'juan-perez-garcia',
              biography: 'Otra bio',
            },
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'author_only_candidate',
              rawReview: '<p>Otra bio distinta</p>',
            },
          }),
        ],
      }),
    );

    expect(result.authorDuplicateReview.groups[0]?.proposal).toMatch(
      /KEEP_SEPARATE|MANUAL_REVIEW/u,
    );
  });

  it('selects a modern author with clean slug as canonical', () => {
    const base = createAuthor();
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({
            candidateKey: 'author:legacy',
            sourceWpPostId: '10',
            input: { ...base.input, slug: 'juan-perez-2' },
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
          createAuthor({
            candidateKey: 'author:modern',
            sourceWpPostId: '20',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'author_only_candidate',
            },
          }),
        ],
      }),
    );

    expect(result.authorDuplicateReview.groups[0]?.canonicalCandidateKey).toBe('author:modern');
  });

  it('remaps duplicate author relations to the canonical author and deduplicates them', () => {
    const base = createAuthor();
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({
            candidateKey: 'author:1',
            status: 'BLOCKED',
            action: 'REQUIRES_DUPLICATE_DECISION',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...base.input, slug: 'juan-perez-2' },
            status: 'BLOCKED',
            action: 'REQUIRES_DUPLICATE_DECISION',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
        ],
        relations: [
          createRelation({
            authorCandidateKey: 'author:1',
            status: 'BLOCKED',
            action: 'BLOCKED',
            blockingReasons: ['Autor relacionado no tiene mapping READY.'],
          }),
          createRelation({
            authorCandidateKey: 'author:2',
            sourceWpPostId: '2',
            status: 'BLOCKED',
            action: 'BLOCKED',
            blockingReasons: ['Autor relacionado no tiene mapping READY.'],
          }),
        ],
      }),
    );

    expect(result.relationResolution.afterHighConfidence.ready).toBe(1);
    expect(result.relationResolution.afterHighConfidence.duplicateBookAuthorRelations).toBe(1);
  });

  it('preserves real multi-author books after relation simulation', () => {
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({ candidateKey: 'author:1' }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, name: 'Maria Lopez', slug: 'maria-lopez' },
          }),
        ],
        relations: [
          createRelation({ authorCandidateKey: 'author:1' }),
          createRelation({ authorCandidateKey: 'author:2', sourceWpPostId: '2' }),
        ],
      }),
    );

    expect(result.relationResolution.afterHighConfidence.multiAuthorBooks).toEqual([
      { bookCandidateKey: 'book:uno', authors: ['author:1', 'author:2'] },
    ]);
  });

  it('keeps unresolved author relations blocked', () => {
    const result = resolveMassBlockers(
      createInput({
        relations: [
          createRelation({
            authorCandidateKey: 'author:missing',
            status: 'BLOCKED',
            action: 'BLOCKED',
            blockingReasons: ['Autor relacionado no tiene mapping READY.'],
          }),
        ],
      }),
    );

    expect(result.relationResolution.afterHighConfidence.stillBlocked).toBe(1);
  });

  it('detects post-merge slug conflicts among remaining authors', () => {
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({ candidateKey: 'author:1' }),
          createAuthor({ candidateKey: 'author:2', sourceWpPostId: '2' }),
        ],
      }),
    );

    expect(result.postMergeSlugConflicts).toEqual([
      { slug: 'juan-perez', candidateKeys: ['author:1', 'author:2'] },
    ]);
  });

  it('analyzes book:r as a manual review case when the title is one visible character', () => {
    const result = resolveMassBlockers(
      createInput({
        books: [
          createBook({
            candidateKey: 'book:r',
            sourceWpPostId: '1376',
            status: 'BLOCKED',
            action: 'MANUAL_REVIEW',
            input: { ...createBook().input, title: 'R', slug: 'r' },
            blockingReasons: ['Input de libro invalido para el schema actual.'],
          }),
        ],
        audit: {
          books: [
            createAuditBook({
              candidateKey: 'book:r',
              sourceWpPostId: '1376',
              title: 'R',
              normalizedTitle: 'r',
              thumbnailId: '10',
            }),
          ],
        },
      }),
    );

    expect(result.bookR.status).toBe('MANUAL_REVIEW');
    expect(result.bookR.tfLibroRaw).toBe('R');
  });

  it('reports before and after simulation counts', () => {
    const result = resolveMassBlockers(
      createInput({
        authors: [
          createAuthor({ candidateKey: 'author:1', status: 'READY' }),
          createAuthor({
            candidateKey: 'author:2',
            sourceWpPostId: '2',
            input: { ...createAuthor().input, slug: 'juan-perez-2' },
            status: 'BLOCKED',
            action: 'REQUIRES_DUPLICATE_DECISION',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
          createAuthor({
            candidateKey: 'author:3',
            sourceWpPostId: '3',
            input: { ...createAuthor().input, slug: 'juan-perez-3' },
            status: 'BLOCKED',
            action: 'REQUIRES_DUPLICATE_DECISION',
            sourceMetadata: {
              possibleDuplicateGroup: 'possible-author:juan perez',
              classification: 'legacy_author_book_combined',
            },
          }),
        ],
        relations: [
          createRelation({ authorCandidateKey: 'author:1' }),
          createRelation({
            authorCandidateKey: 'author:2',
            status: 'BLOCKED',
            action: 'BLOCKED',
            blockingReasons: ['Autor relacionado no tiene mapping READY.'],
          }),
        ],
      }),
    );

    expect(result.simulation.before.authorsBlocked).toBe(2);
    expect(result.simulation.afterHighConfidence.relationsReady).toBeGreaterThanOrEqual(1);
  });
});
