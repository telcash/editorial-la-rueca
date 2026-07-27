export const PUBLIC_BOOKS_PAGE_SIZE = 12;
export const PUBLIC_AUTHORS_PAGE_SIZE = 20;

export function parsePublicPage(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(rawValue ?? '1', 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function parsePublicSearchParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const trimmedValue = rawValue?.trim();

  return trimmedValue ? trimmedValue : undefined;
}
