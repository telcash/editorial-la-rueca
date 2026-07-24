import { describe, expect, it } from 'vitest';

import { ADMIN_LIST_PAGE_SIZE, createPaginatedResult, parseAdminListQuery } from './list-query';

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
    expect(parseAdminListQuery({ status: 'archived', q: '  libro  ', page: '3' })).toEqual({
      status: 'archived',
      query: 'libro',
      page: 3,
      pageSize: ADMIN_LIST_PAGE_SIZE,
    });
  });

  it('normalizes invalid pages to the first page', () => {
    expect(parseAdminListQuery({ page: '-2' }).page).toBe(1);
    expect(parseAdminListQuery({ page: 'abc' }).page).toBe(1);
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
