const htmlEntityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&nbsp;': ' ',
};

export function toPlainPublicText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#039|nbsp);/g, (entity) => htmlEntityMap[entity] ?? entity)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text || null;
}
