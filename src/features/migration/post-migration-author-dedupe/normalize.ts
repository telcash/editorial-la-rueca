export function normalizeAuthorName(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSlugBase(slug: string) {
  return slug.trim().toLowerCase().replace(/-\d+$/u, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function getSlugNumericSuffix(slug: string) {
  const match = /-(\d+)$/u.exec(slug.trim().toLowerCase());

  return match ? Number(match[1]) : null;
}

export function normalizeComparableText(value: string | null) {
  if (!value) {
    return '';
  }

  return value
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
