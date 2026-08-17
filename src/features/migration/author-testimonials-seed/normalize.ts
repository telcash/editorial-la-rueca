export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeForMatch(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/ñ/g, 'n')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSlugComparison(value: string): string {
  return normalizeForMatch(value).replace(/\s+/g, '-');
}

export function expandObviousNameAbbreviations(value: string): string {
  return normalizeForMatch(value)
    .replace(/\bvte\b/g, 'vicente')
    .replace(/\bm\b/g, 'm');
}

export function normalizeQuoteFingerprint(value: string): string {
  return normalizeForMatch(value);
}

export function getTokenSet(value: string): Set<string> {
  return new Set(normalizeForMatch(value).split(' ').filter(Boolean));
}

export function getTokenOverlapRatio(left: string, right: string): number {
  const leftTokens = getTokenSet(left);
  const rightTokens = getTokenSet(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const smaller = leftTokens.size <= rightTokens.size ? leftTokens : rightTokens;
  const larger = leftTokens.size <= rightTokens.size ? rightTokens : leftTokens;
  let overlap = 0;

  for (const token of smaller) {
    if (larger.has(token)) {
      overlap += 1;
    }
  }

  return overlap / smaller.size;
}
