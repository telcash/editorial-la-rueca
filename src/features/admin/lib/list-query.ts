import type { ArchiveStatus } from './archive-status';
import { parseArchiveStatus } from './archive-status';

export const ADMIN_LIST_PAGE_SIZE = 20;
export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

export type AdminPageSize = (typeof ADMIN_LIST_PAGE_SIZE_OPTIONS)[number];
export type TriStateFilter = 'all' | 'true' | 'false';

export interface AdminListQuery {
  status: ArchiveStatus;
  query: string;
  page: number;
  pageSize: number;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface RawListSearchParams {
  status?: string;
  q?: string;
  page?: string;
  pageSize?: string;
}

function parsePage(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsedPage = Number(value);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1;
  }

  return parsedPage;
}

export function parseAdminPageSize(value: string | undefined): AdminPageSize {
  const parsedPageSize = Number(value);

  return ADMIN_LIST_PAGE_SIZE_OPTIONS.includes(parsedPageSize as AdminPageSize)
    ? (parsedPageSize as AdminPageSize)
    : ADMIN_LIST_PAGE_SIZE;
}

export function parseTriStateFilter(value: string | undefined): TriStateFilter {
  return value === 'true' || value === 'false' ? value : 'all';
}

export function normalizeListSearchQuery(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseAdminListQuery(params: RawListSearchParams): AdminListQuery {
  return {
    status: parseArchiveStatus(params.status),
    query: normalizeListSearchQuery(params.q),
    page: parsePage(params.page),
    pageSize: parseAdminPageSize(params.pageSize),
  };
}

export function buildListHref(
  baseHref: string,
  params: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') {
      continue;
    }

    if (key === 'status' && value === 'active') {
      continue;
    }

    if (key === 'page' && value === 1) {
      continue;
    }

    if (key === 'pageSize' && value === ADMIN_LIST_PAGE_SIZE) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const search = searchParams.toString();

  return search ? `${baseHref}?${search}` : baseHref;
}

export function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set([
    1,
    totalPages,
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((firstPage, secondPage) => firstPage - secondPage);
}

export function createPaginatedResult<TItem>(
  items: TItem[],
  totalItems: number,
  page: number,
  pageSize: number,
): PaginatedResult<TItem> {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  return {
    items,
    totalItems,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function getOffset(page: number, pageSize: number): number {
  return (Math.max(page, 1) - 1) * pageSize;
}
