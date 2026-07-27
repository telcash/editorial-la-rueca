import { describe, expect, it } from 'vitest';

import {
  ADMIN_LIST_PAGE_SIZE,
  buildListHref,
  createPaginatedResult,
  getVisiblePageNumbers,
  parseAdminListQuery,
  parseTriStateFilter,
} from './list-query';

describe('admin list query helpers', () => {
  it('parses defaults for list search params', () => {
    expect(parseAdminListQuery({})).toEqual({
      status: 'active',
      query: '',
      page: 1,
      pageSize: ADMIN_LIST_PAGE_SIZE,
    });
  });

  it('preserves search and archived filters', () => {
    expect(
      parseAdminListQuery({ status: 'archived', q: '  libro  ', page: '3', pageSize: '50' }),
    ).toEqual({
      status: 'archived',
      query: 'libro',
      page: 3,
      pageSize: 50,
    });
  });

  it('normalizes invalid pages to the first page', () => {
    expect(parseAdminListQuery({ page: '-2' }).page).toBe(1);
    expect(parseAdminListQuery({ page: 'abc' }).page).toBe(1);
    expect(parseAdminListQuery({ pageSize: '999' }).pageSize).toBe(ADMIN_LIST_PAGE_SIZE);
  });

  it('parses tri-state filters', () => {
    expect(parseTriStateFilter('true')).toBe('true');
    expect(parseTriStateFilter('false')).toBe('false');
    expect(parseTriStateFilter('other')).toBe('all');
  });

  it('builds list hrefs without default params and resets pages when requested', () => {
    expect(
      buildListHref('/admin/books', {
        q: 'poesia',
        status: 'active',
        published: 'true',
        page: 1,
        pageSize: 20,
      }),
    ).toBe('/admin/books?q=poesia&published=true');
  });

  it('returns compact visible page numbers for numbered pagination', () => {
    expect(getVisiblePageNumbers(6, 14)).toEqual([1, 4, 5, 6, 7, 8, 14]);
    expect(getVisiblePageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('creates pagination metadata', () => {
    expect(createPaginatedResult(['a'], 41, 3, 20)).toEqual({
      items: ['a'],
      totalItems: 41,
      page: 3,
      pageSize: 20,
      totalPages: 3,
    });
  });
});
