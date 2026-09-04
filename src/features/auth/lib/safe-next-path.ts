const DEFAULT_NEXT_PATH = '/admin';

export function getSafeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const parsedPath = new URL(next, 'http://localhost');

    if (parsedPath.origin !== 'http://localhost') {
      return DEFAULT_NEXT_PATH;
    }
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  return next;
}
