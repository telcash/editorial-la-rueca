import type { QuaresBookCandidate } from './types';

export interface QuaresSimilaritySuggestion {
  book: QuaresBookCandidate;
  score: number;
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );
    }

    previous = current;
  }

  return previous[right.length] ?? Math.max(left.length, right.length);
}

export function calculateTitleSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  const maxLength = Math.max(left.length, right.length);

  if (maxLength === 0) {
    return 1;
  }

  const distance = levenshteinDistance(left, right);

  return 1 - distance / maxLength;
}

export function findTitleSuggestions(
  normalizedSourceTitle: string,
  books: QuaresBookCandidate[],
  limit = 3,
): QuaresSimilaritySuggestion[] {
  return books
    .map((book) => {
      const titleScore = calculateTitleSimilarity(normalizedSourceTitle, book.normalizedTitle);

      const slugScore = calculateTitleSimilarity(
        normalizedSourceTitle.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''),
        normalizeSlugForComparison(book.slug),
      );

      return {
        book,
        score: Math.max(titleScore, slugScore),
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.book.title.localeCompare(right.book.title, 'es');
    })
    .slice(0, limit);
}

function normalizeSlugForComparison(slug: string): string {
  return slug
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/-/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim();
}
