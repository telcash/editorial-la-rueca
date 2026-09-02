import { describe, expect, it } from 'vitest';

import { calculateTitleSimilarity, findTitleSuggestions } from './similarity';
import type { QuaresBookCandidate } from './types';

function createBook(id: string, title: string): QuaresBookCandidate {
  return {
    id,
    title,
    normalizedTitle: title.toLocaleLowerCase('es'),
    slug: id,
    isArchived: false,
    authors: [],
  };
}

describe('calculateTitleSimilarity', () => {
  it('returns 1 for identical titles', () => {
    expect(calculateTitleSimilarity('cuando el río suena', 'cuando el río suena')).toBe(1);
  });

  it('returns a high score for a small spelling difference', () => {
    const score = calculateTitleSimilarity('el jóven fénix', 'el joven fénix');

    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThan(1);
  });

  it('returns a lower score for unrelated titles', () => {
    const score = calculateTitleSimilarity('el jóven fénix', 'nagasaki');

    expect(score).toBeLessThan(0.5);
  });
});

describe('findTitleSuggestions', () => {
  it('orders candidates from most to least similar', () => {
    const books = [
      createBook('unrelated', 'Nagasaki'),
      createBook('close', 'El joven Fénix'),
      createBook('medium', 'El camino del ángel'),
    ];

    const suggestions = findTitleSuggestions('el jóven fénix', books, 3);

    expect(suggestions[0]?.book.id).toBe('close');
  });

  it('respects the requested limit', () => {
    const books = [
      createBook('one', 'Libro uno'),
      createBook('two', 'Libro dos'),
      createBook('three', 'Libro tres'),
    ];

    expect(findTitleSuggestions('libro', books, 2)).toHaveLength(2);
  });
});
