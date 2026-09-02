export function normalizeBookTitle(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([¿¡(])\s+/g, '$1')
    .replace(/\s+\)/g, ')');
}
