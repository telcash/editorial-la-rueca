export function stripHtmlForPreview(value: string, maxLength = 240) {
  const plainText = decodeXmlEntities(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length > maxLength ? `${plainText.slice(0, maxLength - 1).trim()}…` : plainText;
}

export function normalizeName(value: string) {
  return normalizeText(value);
}

export function normalizeTitle(value: string) {
  return normalizeText(value);
}

export function normalizeSlugComparison(value: string) {
  return decodeXmlEntities(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/-\d+$/u, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

export function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');
}

function normalizeText(value: string) {
  return decodeXmlEntities(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
