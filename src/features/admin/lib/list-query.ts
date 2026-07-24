import type { ArchiveStatus } from './archive-status';
import { parseArchiveStatus } from './archive-status';

export const ADMIN_LIST_PAGE_SIZE = 20;

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

export function normalizeListSearchQuery(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function parseAdminListQuery(params: RawListSearchParams): AdminListQuery {
  return {
    status: parseArchiveStatus(params.status),
    query: normalizeListSearchQuery(params.q),
    page: parsePage(params.page),
    pageSize: ADMIN_LIST_PAGE_SIZE,
  };
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
