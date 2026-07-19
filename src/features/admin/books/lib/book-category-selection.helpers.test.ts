import { describe, expect, it } from 'vitest';

import type { BookFormCategorySummary } from '../types/book-form-state';
import {
  addSelectedCategory,
  filterAvailableCategories,
  getCategoryIds,
  mergeAvailableCategories,
  moveSelectedCategoryDown,
  moveSelectedCategoryUp,
  removeSelectedCategory,
} from './book-category-selection.helpers';

const narrative: BookFormCategorySummary = {
  id: '8a9dd9a7-a564-44f3-b65f-94f0390b6d75',
  name: 'Narrativa',
  slug: 'narrativa',
  isArchived: false,
};

const poetry: BookFormCategorySummary = {
  id: '781ea7e4-a50f-40ce-a168-3c29ee0a0d1a',
  name: 'Poesía',
  slug: 'poesia',
  isArchived: false,
};

const archivedEssay: BookFormCategorySummary = {
  id: '8fc82f60-ce2f-4425-a921-3d1382a4e5d2',
  name: 'Ensayo archivado',
  slug: 'ensayo-archivado',
  isArchived: true,
};

describe('book category selection helpers', () => {
  it('adds categories without duplicates', () => {
    expect(addSelectedCategory([], narrative)).toEqual([narrative]);
    expect(addSelectedCategory([narrative], narrative)).toEqual([narrative]);
  });

  it('removes categories by id', () => {
    expect(removeSelectedCategory([narrative, poetry], narrative.id)).toEqual([poetry]);
    expect(removeSelectedCategory([narrative], 'unknown')).toEqual([narrative]);
  });

  it('moves categories up and down preserving boundaries', () => {
    expect(moveSelectedCategoryUp([narrative, poetry], poetry.id)).toEqual([poetry, narrative]);
    expect(moveSelectedCategoryUp([narrative, poetry], narrative.id)).toEqual([narrative, poetry]);
    expect(moveSelectedCategoryDown([narrative, poetry], narrative.id)).toEqual([
      poetry,
      narrative,
    ]);
    expect(moveSelectedCategoryDown([narrative, poetry], poetry.id)).toEqual([narrative, poetry]);
  });

  it('extracts ids in visual order', () => {
    expect(getCategoryIds([poetry, narrative])).toEqual([poetry.id, narrative.id]);
  });

  it('filters available categories by query and selected ids', () => {
    expect(filterAvailableCategories([narrative, poetry], [narrative], 'poe')).toEqual([poetry]);
    expect(filterAvailableCategories([narrative, poetry], [], 'narr')).toEqual([narrative]);
  });

  it('merges active categories with selected archived categories', () => {
    expect(mergeAvailableCategories([poetry], [archivedEssay, poetry])).toEqual([
      archivedEssay,
      poetry,
    ]);
  });
});
