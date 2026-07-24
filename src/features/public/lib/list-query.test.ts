import { describe, expect, it } from 'vitest';

import {
  parsePublicPage,
  parsePublicSearchParam,
  PUBLIC_AUTHORS_PAGE_SIZE,
  PUBLIC_BOOKS_PAGE_SIZE,
} from './list-query';

describe('public list query helpers', () => {
  it('keeps the configured public page sizes explicit', () => {
    expect(PUBLIC_BOOKS_PAGE_SIZE).toBe(12);
    expect(PUBLIC_AUTHORS_PAGE_SIZE).toBe(12);
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
