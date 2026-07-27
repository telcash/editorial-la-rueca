import { describe, expect, it } from 'vitest';

import { createPaginatedResult, getOffset } from '@/features/admin/lib/list-query';
import {
  parsePublicPage,
  parsePublicSearchParam,
  PUBLIC_AUTHORS_PAGE_SIZE,
  PUBLIC_BOOKS_PAGE_SIZE,
} from './list-query';

describe('public list query helpers', () => {
  it('keeps the configured public page sizes explicit', () => {
    expect(PUBLIC_BOOKS_PAGE_SIZE).toBe(12);
    expect(PUBLIC_AUTHORS_PAGE_SIZE).toBe(20);
  });

  it('uses the public author page size for offsets and total pages', () => {
    expect(getOffset(1, PUBLIC_AUTHORS_PAGE_SIZE)).toBe(0);
    expect(getOffset(2, PUBLIC_AUTHORS_PAGE_SIZE)).toBe(20);
    expect(createPaginatedResult([], 190, 1, PUBLIC_AUTHORS_PAGE_SIZE).totalPages).toBe(10);
    expect(createPaginatedResult([], 190, 10, PUBLIC_AUTHORS_PAGE_SIZE).page).toBe(10);
  });

  it('normalizes invalid pages to the first page', () => {
    expect(parsePublicPage(undefined)).toBe(1);
    expect(parsePublicPage('-2')).toBe(1);
    expect(parsePublicPage('abc')).toBe(1);
  });

  it('uses the first value when search params arrive as arrays', () => {
    expect(parsePublicPage(['3', '4'])).toBe(3);
    expect(parsePublicSearchParam([' narrativa ', 'poesia'])).toBe('narrativa');
  });

  it('trims empty public search params to undefined', () => {
    expect(parsePublicSearchParam(undefined)).toBeUndefined();
    expect(parsePublicSearchParam('   ')).toBeUndefined();
    expect(parsePublicSearchParam(' autora ')).toBe('autora');
  });
});
