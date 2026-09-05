export interface UtmGeneratorValues {
  source: string;
  medium: string;
  campaign: string;
  format: string;
  contentIdentifier: string;
  variant: string;
  term: string;
}

export interface UtmDestination {
  type: 'contact' | 'home' | 'book' | 'author' | 'custom';
  bookSlug?: string;
  authorSlug?: string;
  customUrl?: string;
}

export interface BuildUtmUrlOptions {
  baseUrl: URL;
  destination: UtmDestination;
  values: UtmGeneratorValues;
}

export function normalizeUtmValue(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function formatUtmVariant(value: string): string {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
    return '';
  }

  return String(parsed).padStart(2, '0');
}

export function getCampaignValue(
  type: 'standard' | 'book' | 'author' | 'event' | 'custom',
  value: string,
): string {
  if (type === 'book' || type === 'author') {
    return `${type === 'book' ? 'libro' : 'autor'}_${normalizeUtmValue(value)}`;
  }

  if (type === 'event') {
    return `evento_${normalizeUtmValue(value)}`;
  }

  return type === 'custom' ? normalizeUtmValue(value) : value;
}

function getDestinationUrl(baseUrl: URL, destination: UtmDestination): URL | null {
  if (destination.type === 'contact') {
    const url = new URL(baseUrl);
    url.hash = 'publica-tu-libro';
    return url;
  }

  if (destination.type === 'home') {
    return new URL(baseUrl);
  }

  if (destination.type === 'book' && destination.bookSlug) {
    return new URL(`/libros/${encodeURIComponent(destination.bookSlug)}`, baseUrl);
  }

  if (destination.type === 'author' && destination.authorSlug) {
    return new URL(`/autores/${encodeURIComponent(destination.authorSlug)}`, baseUrl);
  }

  if (destination.type !== 'custom' || !destination.customUrl?.trim()) {
    return null;
  }

  const rawUrl = destination.customUrl.trim();

  if (rawUrl.startsWith('//') || /^(javascript|data|vbscript):/i.test(rawUrl)) {
    return null;
  }

  try {
    const url = new URL(rawUrl, baseUrl);

    if (url.protocol !== baseUrl.protocol && !['http:', 'https:'].includes(url.protocol)) {
      return null;
    }

    if (url.origin !== baseUrl.origin) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function buildUtmUrl({ baseUrl, destination, values }: BuildUtmUrlOptions): string | null {
  const campaign = values.campaign.trim();
  const contentIdentifier = normalizeUtmValue(values.contentIdentifier);
  const variant = formatUtmVariant(values.variant);
  const source = values.source.trim();
  const medium = values.medium.trim();
  const format = normalizeUtmValue(values.format);

  if (!source || !medium || !campaign || !format || !contentIdentifier || !variant) {
    return null;
  }

  const url = getDestinationUrl(baseUrl, destination);

  if (!url) {
    return null;
  }

  url.searchParams.delete('utm_source');
  url.searchParams.delete('utm_medium');
  url.searchParams.delete('utm_campaign');
  url.searchParams.delete('utm_content');
  url.searchParams.delete('utm_term');
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', medium);
  url.searchParams.set('utm_campaign', campaign);
  url.searchParams.set('utm_content', `${format}_${contentIdentifier}_${variant}`);

  const term = normalizeUtmValue(values.term);
  if (term) {
    url.searchParams.set('utm_term', term);
  }

  return url.toString();
}
