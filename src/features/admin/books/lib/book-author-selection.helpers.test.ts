import { describe, expect, it } from 'vitest';

import type { BookFormAuthorSummary } from '../types/book-form-state';
import {
  addSelectedAuthor,
  filterAvailableAuthors,
  getAuthorIds,
  moveSelectedAuthorDown,
  moveSelectedAuthorUp,
  removeSelectedAuthor,
} from './book-author-selection.helpers';

const authors: BookFormAuthorSummary[] = [
  {
    id: 'author-1',
    name: 'Ana Jardín',
    slug: 'ana-jardin',
    photoUrl: null,
    isArchived: false,
  },
  {
    id: 'author-2',
    name: 'Bea Luna',
    slug: 'bea-luna',
    photoUrl: null,
    isArchived: false,
  },
  {
    id: 'author-3',
    name: 'César Río',
    slug: 'cesar-rio',
    photoUrl: null,
    isArchived: false,
  },
];

const firstAuthor = authors[0] as BookFormAuthorSummary;
const thirdAuthor = authors[2] as BookFormAuthorSummary;

describe('book author selection helpers', () => {
  it('adds authors without duplicating them', () => {
    expect(addSelectedAuthor([], firstAuthor)).toEqual([firstAuthor]);
    expect(addSelectedAuthor([firstAuthor], firstAuthor)).toEqual([firstAuthor]);
  });

  it('removes authors', () => {
    expect(removeSelectedAuthor(authors, 'author-2')).toEqual([firstAuthor, thirdAuthor]);
  });

  it('moves authors up respecting limits', () => {
    expect(moveSelectedAuthorUp(authors, 'author-1')).toBe(authors);
    expect(getAuthorIds(moveSelectedAuthorUp(authors, 'author-3'))).toEqual([
      'author-1',
      'author-3',
      'author-2',
    ]);
  });

  it('moves authors down respecting limits', () => {
    expect(moveSelectedAuthorDown(authors, 'author-3')).toBe(authors);
    expect(getAuthorIds(moveSelectedAuthorDown(authors, 'author-1'))).toEqual([
      'author-2',
      'author-1',
      'author-3',
    ]);
  });

  it('returns ordered author ids', () => {
    expect(getAuthorIds(authors)).toEqual(['author-1', 'author-2', 'author-3']);
  });

  it('filters available authors by name and slug without accents or case', () => {
    expect(filterAvailableAuthors(authors, [firstAuthor], '').map((author) => author.id)).toEqual([
      'author-2',
      'author-3',
    ]);
    expect(filterAvailableAuthors(authors, [], 'cesar').map((author) => author.id)).toEqual([
      'author-3',
    ]);
    expect(filterAvailableAuthors(authors, [], 'RÍO').map((author) => author.id)).toEqual([
      'author-3',
    ]);
  });
});
