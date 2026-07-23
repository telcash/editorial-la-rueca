import { describe, expect, it } from 'vitest';

import { analyzeBookCoverCandidates, getPilotBookCoverMatches } from './book-cover-analysis';
import type {
  PilotAttachmentCandidate,
  PilotAuthorCandidate,
  PilotAuditData,
  PilotBookCandidate,
} from '@/features/migration/wordpress-pilot/types';

function createBook(overrides: Partial<PilotBookCandidate> = {}): PilotBookCandidate {
  return {
    candidateKey: 'book:el valle de cristal',
    sourceWpPostId: '556',
    title: 'El Valle de Cristal',
    normalizedTitle: 'el valle de cristal',
    sourceAuthorTitle: 'Guillermo M. Schrem',
    sourceAuthorSlug: 'guillermo-m-schrem',
    sourceOldUrl: 'https://example.com/autor/guillermo-m-schrem/',
    rawReview: '',
    plainTextPreview: '',
    videoId: '',
    thumbnailId: '',
    thumbnailUrl: '',
    duplicateGroupId: '',
    ...overrides,
  };
}

function createAuthor(overrides: Partial<PilotAuthorCandidate> = {}): PilotAuthorCandidate {
  return {
    candidateKey: 'author:556',
    sourceWpPostId: '556',
    name: 'Guillermo M. Schrem',
    normalizedName: 'guillermo m schrem',
    slug: 'guillermo-m-schrem',
    normalizedSlug: 'guillermo-m-schrem',
    oldUrl: 'https://example.com/autor/guillermo-m-schrem/',
    rawReview: '',
    plainTextPreview: '',
    bioCandidate: '',
    thumbnailId: '',
    thumbnailUrl: '',
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

function createAttachment(
  overrides: Partial<PilotAttachmentCandidate> = {},
): PilotAttachmentCandidate {
  return {
    wpPostId: '900',
    title: '',
    slug: '',
    url: 'https://example.com/wp-content/uploads/image.jpg',
    parentId: '',
    mimeType: 'image/jpeg',
    width: '600',
    height: '900',
    attachedFile: 'image.jpg',
    ...overrides,
  };
}

function analyze(overrides: {
  books?: PilotBookCandidate[];
  authors?: PilotAuthorCandidate[];
  attachments: PilotAttachmentCandidate[];
}): ReturnType<typeof analyzeBookCoverCandidates> {
  const data: Pick<PilotAuditData, 'books' | 'authors' | 'relationships' | 'attachments'> = {
    books: overrides.books ?? [createBook()],
    authors: overrides.authors ?? [createAuthor()],
    relationships: [
      {
        bookCandidateKey: 'book:el valle de cristal',
        authorCandidateKey: 'author:556',
        sourceWpPostId: '556',
        confidence: 'high',
        reason: 'fixture',
      },
    ],
    attachments: overrides.attachments,
  };

  return analyzeBookCoverCandidates(data);
}

describe('book cover analysis', () => {
  it('scores a filename equal to the book title as high confidence', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '1',
          attachedFile: 'ElValleDeCristal.jpg',
          slug: 'el-valle-de-cristal',
        }),
      ],
    });

    expect(result.bestMatches[0]?.confidence).toBe('high');
    expect(result.bestMatches[0]?.bestCandidate?.attachmentId).toBe('1');
  });

  it('scores portada-{title} as high confidence', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '2',
          attachedFile: 'portada-el-valle-de-cristal.webp',
          slug: 'portada-el-valle-de-cristal',
          mimeType: 'image/webp',
        }),
      ],
    });

    expect(result.bestMatches[0]?.confidence).toBe('high');
    expect(result.bestMatches[0]?.bestCandidate?.score).toBeGreaterThanOrEqual(70);
  });

  it('penalizes author photos', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '3',
          attachedFile: 'FotoAutor.jpg',
          title: 'Foto Guillermo M. Schrem',
          slug: 'foto-guillermo-m-schrem',
          width: '600',
          height: '900',
        }),
      ],
    });

    expect(result.bestMatches[0]?.bestCandidate).toBeNull();
  });

  it('does not treat vertical aspect ratio alone as enough evidence', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '4',
          attachedFile: 'archivo-123.jpg',
          title: 'Archivo 123',
          slug: 'archivo-123',
          width: '600',
          height: '900',
        }),
      ],
    });

    expect(result.bestMatches[0]?.bestCandidate).toBeNull();
    expect(result.candidates[0]?.confidence).toBe('low');
  });

  it('orders multiple candidates by score', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '5',
          attachedFile: 'archivo-vertical.jpg',
          width: '600',
          height: '900',
        }),
        createAttachment({
          wpPostId: '6',
          attachedFile: 'portada-el-valle-de-cristal.jpg',
          slug: 'portada-el-valle-de-cristal',
          width: '600',
          height: '900',
        }),
      ],
    });

    expect(result.bestMatches[0]?.bestCandidate?.attachmentId).toBe('6');
    expect(result.candidates.map((candidate) => candidate.attachmentId)).toEqual(['6', '5']);
  });

  it('returns null when there is no evidence', () => {
    const result = analyze({
      attachments: [
        createAttachment({
          wpPostId: '7',
          attachedFile: 'unrelated-horizontal.jpg',
          title: 'Paisaje',
          slug: 'paisaje',
          width: '1200',
          height: '600',
        }),
      ],
    });

    expect(result.bestMatches[0]?.bestCandidate).toBeNull();
    expect(result.statistics.withoutCandidate).toBe(1);
  });

  it('does not confuse a vertical author photo with a cover even if it is linked as thumbnail', () => {
    const result = analyze({
      authors: [createAuthor({ thumbnailId: '8' })],
      attachments: [
        createAttachment({
          wpPostId: '8',
          attachedFile: 'foto-guillermo-m-schrem.jpg',
          title: 'Foto Guillermo M. Schrem',
          slug: 'foto-guillermo-m-schrem',
          width: '600',
          height: '900',
        }),
      ],
    });

    expect(result.bestMatches[0]?.bestCandidate).toBeNull();
  });

  it('groups duplicate pilot legacy records by title for visual review', () => {
    const result = analyze({
      books: [
        createBook({
          candidateKey: 'book:cruce de pasos',
          title: 'Cruce de Pasos',
          sourceWpPostId: '619',
        }),
        createBook({
          candidateKey: 'book:cruce de pasos',
          title: 'Cruce de Pasos',
          sourceWpPostId: '563',
        }),
      ],
      attachments: [
        createAttachment({
          wpPostId: '9',
          attachedFile: 'portada-cruce-de-pasos.jpg',
          slug: 'portada-cruce-de-pasos',
        }),
      ],
    });

    expect(getPilotBookCoverMatches(result)).toHaveLength(1);
  });
});
