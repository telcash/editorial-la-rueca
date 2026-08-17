import { describe, expect, it } from 'vitest';

import { initialAuthorTestimonials } from '../../../../data/author-testimonials.initial';
import { assertAuthorTestimonialsSeedApplyConfirmation } from './confirmation';
import {
  createTestimonialKey,
  parseAuthorTestimonialsSeedDecisions,
  serializeAuthorTestimonialsSeedDecisions,
} from './decisions';
import { normalizeForMatch, normalizeWhitespace } from './normalize';
import { matchAuthor, matchBook, planAuthorTestimonialsSeed } from './planner';
import type { SeedAuthorRow, SeedBookRow } from './types';

const authorId = '8a9dd9a7-a564-44f3-b65f-94f0390b6d75';
const bookId = '4250d083-874a-4095-ae82-77490910d9b1';

const exactAuthor: SeedAuthorRow = {
  id: authorId,
  name: 'Osian R. Vaquero',
  slug: 'osian-r-vaquero',
  photoUrl: null,
  books: [],
};

const exactBook: SeedBookRow = {
  id: bookId,
  title: 'El arte del cosplay',
  slug: 'el-arte-del-cosplay',
  authors: [{ id: authorId, name: 'Osian R. Vaquero', slug: 'osian-r-vaquero' }],
};

describe('author testimonials seed planner', () => {
  it('contains exactly 27 initial testimonials', () => {
    expect(initialAuthorTestimonials).toHaveLength(27);
  });

  it('normalizes whitespace and matching text without rewriting content', () => {
    expect(normalizeWhitespace('  Gracias\\npor   todo  ')).toBe('Gracias\\npor todo');
    expect(normalizeForMatch('José Vte. Carmona')).toBe('jose vte carmona');
  });

  it('detects exact author matches', () => {
    const match = matchAuthor('OSIAN R. VAQUERO', [exactAuthor]);

    expect(match.status).toBe('EXACT_AUTHOR_MATCH');
    expect(match.selectedAuthor?.id).toBe(authorId);
  });

  it('detects likely author matches without approving them automatically', () => {
    const match = matchAuthor('JESÚS BOCHO', [
      {
        id: authorId,
        name: 'Jesús Bocho Gascón',
        slug: 'jesus-bocho-gascon',
        photoUrl: null,
        books: [],
      },
    ]);

    expect(match.status).toBe('LIKELY_AUTHOR_MATCH');
    expect(match.selectedAuthor?.name).toBe('Jesús Bocho Gascón');
  });

  it('detects missing authors', () => {
    const match = matchAuthor('ALBERTO CAMPOS', [exactAuthor]);

    expect(match.status).toBe('AUTHOR_NOT_FOUND');
  });

  it('detects exact book matches only when the author is compatible', () => {
    const authorMatch = matchAuthor('OSIAN R. VAQUERO', [exactAuthor]);
    const match = matchBook('El arte del cosplay', authorMatch.selectedAuthor, [exactBook]);

    expect(match.status).toBe('EXACT_BOOK_MATCH');
    expect(match.selectedBook?.id).toBe(bookId);
  });

  it('detects ambiguous book matches', () => {
    const authorMatch = matchAuthor('OSIAN R. VAQUERO', [exactAuthor]);
    const match = matchBook('El arte del cosplay', authorMatch.selectedAuthor, [
      exactBook,
      { ...exactBook, id: '9ec2b338-2d28-4f32-86f1-5d41acf7eb65' },
    ]);

    expect(match.status).toBe('AMBIGUOUS_BOOK_MATCH');
  });

  it('keeps book null when no book is suggested', () => {
    const authorMatch = matchAuthor('OSIAN R. VAQUERO', [exactAuthor]);
    const match = matchBook(undefined, authorMatch.selectedAuthor, [exactBook]);

    expect(match.status).toBe('NO_BOOK_SUGGESTED');
    expect(match.selectedBook).toBeNull();
  });

  it('marks existing author plus normalized quote as already existing', () => {
    const plan = planAuthorTestimonialsSeed({
      dataset: [
        {
          sourceName: 'OSIAN R. VAQUERO',
          quote: 'Una maravilla de trato por parte de Almudena.',
          source: 'manual',
        },
      ],
      authors: [exactAuthor],
      books: [],
      existingTestimonials: [
        {
          authorId,
          normalizedQuote: normalizeForMatch('Una maravilla de trato por parte de Almudena.'),
        },
      ],
      decisions: null,
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.status).toBe('SKIP_ALREADY_EXISTS');
    expect(plan.summary.alreadyExisting).toBe(1);
  });

  it('preserves emojis while preparing final inputs', () => {
    const testimonial = initialAuthorTestimonials.find((item) =>
      item.sourceName.includes('ANTONIO LORENZO'),
    );
    const plan = planAuthorTestimonialsSeed({
      dataset: testimonial ? [testimonial] : [],
      authors: [
        {
          id: authorId,
          name: 'Antonio Lorenzo Gómez Charlín',
          slug: 'antonio-lorenzo-gomez-charlin',
          photoUrl: null,
          books: [],
        },
      ],
      books: [
        {
          id: bookId,
          title: 'El lenguaje perdido de las nubes',
          slug: 'el-lenguaje-perdido-de-las-nubes',
          authors: [
            {
              id: authorId,
              name: 'Antonio Lorenzo Gómez Charlín',
              slug: 'antonio-lorenzo-gomez-charlin',
            },
          ],
        },
      ],
      existingTestimonials: [],
      decisions: null,
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.input.quote).toContain('📕');
    expect(plan.items[0]?.input.quote).toContain('🫂');
  });

  it('sets source, rating, publication flags and sort order for all dataset rows', () => {
    const authors: SeedAuthorRow[] = initialAuthorTestimonials.map((item, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name: item.sourceName,
      slug: item.sourceName.toLowerCase().replace(/\s+/g, '-'),
      photoUrl: null,
      books: [],
    }));
    const books: SeedBookRow[] = initialAuthorTestimonials
      .filter((item) => item.suggestedBookTitle)
      .map((item, index) => ({
        id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        title: item.suggestedBookTitle ?? '',
        slug: (item.suggestedBookTitle ?? '').toLowerCase().replace(/\s+/g, '-'),
        authors: [
          {
            id: authors[initialAuthorTestimonials.indexOf(item)]?.id ?? authorId,
            name: item.sourceName,
            slug: item.sourceName.toLowerCase().replace(/\s+/g, '-'),
          },
        ],
      }));
    const plan = planAuthorTestimonialsSeed({
      dataset: initialAuthorTestimonials,
      authors,
      books,
      existingTestimonials: [],
      decisions: null,
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items).toHaveLength(27);
    expect(plan.items.map((item) => item.input.sortOrder)).toEqual(
      Array.from({ length: 27 }, (_item, index) => index + 1),
    );
    expect(plan.items.every((item) => item.input.source === 'manual')).toBe(true);
    expect(plan.items.every((item) => item.input.rating === null)).toBe(true);
    expect(plan.items.every((item) => item.input.isPublished)).toBe(true);
    expect(plan.items.every((item) => item.input.isFeatured)).toBe(true);
  });

  it('protects apply mode with an explicit confirmation token', () => {
    expect(() => assertAuthorTestimonialsSeedApplyConfirmation(undefined)).toThrow(
      'TESTIMONIAL_SEED',
    );
    expect(() => assertAuthorTestimonialsSeedApplyConfirmation('TESTIMONIAL_SEED')).not.toThrow();
  });

  it('serializes and parses editorial decisions', () => {
    const decisions = [
      {
        testimonialKey: '01-osian',
        sourceName: 'OSIAN R. VAQUERO',
        selectedAuthorId: authorId,
        selectedBookId: bookId,
        decision: 'approved' as const,
        notes: 'Correcto',
        reviewed: true,
      },
    ];

    expect(
      parseAuthorTestimonialsSeedDecisions(
        JSON.parse(serializeAuthorTestimonialsSeedDecisions(decisions)),
      ),
    ).toEqual(decisions);
  });

  it('keeps exact matches selected but requires explicit editorial approval when decisions exist', () => {
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Una maravilla de trato.',
      source: 'manual' as const,
      suggestedBookTitle: 'El arte del cosplay',
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [exactBook],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: bookId,
          decision: null,
          notes: '',
          reviewed: false,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.input.authorId).toBe(authorId);
    expect(plan.items[0]?.input.bookId).toBe(bookId);
    expect(plan.items[0]?.status).toBe('BLOCKED');
    expect(plan.items[0]?.reasons).toContain('DECISION_REQUIRED');
  });

  it('lets a likely match be changed to another existing author by decision', () => {
    const otherAuthor: SeedAuthorRow = {
      id: '5067c265-4a7d-4b2d-bfb0-1d28b4cd58fc',
      name: 'Jesús Bocho Gascón',
      slug: 'jesus-bocho-gascon',
      photoUrl: null,
      books: [],
    };
    const testimonial = {
      sourceName: 'JESÚS BOCHO',
      quote: 'Gracias por el trabajo editorial.',
      source: 'manual' as const,
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [otherAuthor, exactAuthor],
      books: [],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: null,
          decision: 'approved',
          notes: '',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.authorMatch.status).toBe('LIKELY_AUTHOR_MATCH');
    expect(plan.items[0]?.input.authorId).toBe(authorId);
    expect(plan.items[0]?.status).toBe('READY_TO_INSERT');
  });

  it('resolves an ambiguous author through an approved decision', () => {
    const duplicateAuthor: SeedAuthorRow = {
      ...exactAuthor,
      id: '5067c265-4a7d-4b2d-bfb0-1d28b4cd58fc',
    };
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Testimonio ambiguo.',
      source: 'manual' as const,
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor, duplicateAuthor],
      books: [],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: duplicateAuthor.id,
          selectedBookId: null,
          decision: 'approved',
          notes: '',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.authorMatch.status).toBe('AMBIGUOUS_AUTHOR_MATCH');
    expect(plan.items[0]?.input.authorId).toBe(duplicateAuthor.id);
    expect(plan.items[0]?.status).toBe('READY_TO_INSERT');
  });

  it('resolves a not found source name manually through an approved decision', () => {
    const testimonial = {
      sourceName: 'ALBERTO CAMPOS',
      quote: 'Testimonio reasignado manualmente.',
      source: 'manual' as const,
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: null,
          decision: 'approved',
          notes: 'Nombre migrado de otra forma.',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.authorMatch.status).toBe('AUTHOR_NOT_FOUND');
    expect(plan.items[0]?.input.authorId).toBe(authorId);
    expect(plan.items[0]?.status).toBe('READY_TO_INSERT');
  });

  it('omits skipped decisions from insertion', () => {
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Testimonio omitido.',
      source: 'manual' as const,
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: null,
          decision: 'skip',
          notes: '',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.status).toBe('MANUAL_REVIEW');
    expect(plan.items[0]?.input.authorId).toBe(authorId);
  });

  it('blocks manual review decisions', () => {
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Testimonio pendiente.',
      source: 'manual' as const,
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: null,
          decision: 'manual_review',
          notes: '',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.status).toBe('BLOCKED');
    expect(plan.items[0]?.reasons).toContain('MANUAL_REVIEW_DECISION');
  });

  it('keeps an exact book association from an approved decision', () => {
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Libro conservado.',
      source: 'manual' as const,
      suggestedBookTitle: 'El arte del cosplay',
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [exactBook],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: bookId,
          decision: 'approved',
          notes: '',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.input.bookId).toBe(bookId);
    expect(plan.items[0]?.status).toBe('READY_TO_INSERT');
  });

  it('allows removing a book association manually', () => {
    const testimonial = {
      sourceName: 'OSIAN R. VAQUERO',
      quote: 'Libro eliminado manualmente.',
      source: 'manual' as const,
      suggestedBookTitle: 'El arte del cosplay',
    };
    const key = createTestimonialKey(1, testimonial.sourceName, testimonial.quote);
    const plan = planAuthorTestimonialsSeed({
      dataset: [testimonial],
      authors: [exactAuthor],
      books: [exactBook],
      existingTestimonials: [],
      decisions: [
        {
          testimonialKey: key,
          sourceName: testimonial.sourceName,
          selectedAuthorId: authorId,
          selectedBookId: null,
          decision: 'approved',
          notes: 'No asociar a libro.',
          reviewed: true,
        },
      ],
      tableExists: true,
      mode: 'dry-run',
    });

    expect(plan.items[0]?.bookMatch.status).toBe('EXACT_BOOK_MATCH');
    expect(plan.items[0]?.input.bookId).toBeNull();
    expect(plan.items[0]?.status).toBe('READY_TO_INSERT');
  });
});
