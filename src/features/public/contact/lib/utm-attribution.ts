import type { PublicContactUtmValues } from '../types/contact-form-state';

import { contactRequestUtmLimits } from '@/schemas/contact-requests/utm';

export const PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY = 'editorial-la-rueca:utm-attribution';
const UTM_ATTRIBUTION_VERSION = 1;

function normalizeValue(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();
  return trimmedValue.length <= maxLength ? trimmedValue : '';
}

export function normalizePublicContactUtmValues(
  values: Partial<Record<keyof PublicContactUtmValues, unknown>>,
): PublicContactUtmValues {
  return {
    utmSource: normalizeValue(values.utmSource, contactRequestUtmLimits.utmSource),
    utmMedium: normalizeValue(values.utmMedium, contactRequestUtmLimits.utmMedium),
    utmCampaign: normalizeValue(values.utmCampaign, contactRequestUtmLimits.utmCampaign),
    utmContent: normalizeValue(values.utmContent, contactRequestUtmLimits.utmContent),
    utmTerm: normalizeValue(values.utmTerm, contactRequestUtmLimits.utmTerm),
  };
}

export function getPublicContactUtmValuesFromSearchParams(
  searchParams: URLSearchParams,
): PublicContactUtmValues {
  return normalizePublicContactUtmValues({
    utmSource: searchParams.get('utm_source'),
    utmMedium: searchParams.get('utm_medium'),
    utmCampaign: searchParams.get('utm_campaign'),
    utmContent: searchParams.get('utm_content'),
    utmTerm: searchParams.get('utm_term'),
  });
}

export function hasPublicContactUtmValues(values: PublicContactUtmValues): boolean {
  return Object.values(values).some((value) => value !== '');
}

export function readPublicContactUtmAttribution(
  storage: Pick<Storage, 'getItem'>,
): PublicContactUtmValues | null {
  const rawValue = storage.getItem(PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object') {
      return null;
    }

    const candidate = parsedValue as Record<string, unknown>;

    if (candidate.version !== UTM_ATTRIBUTION_VERSION) {
      return null;
    }

    const values = normalizePublicContactUtmValues(candidate);
    return hasPublicContactUtmValues(values) ? values : null;
  } catch {
    return null;
  }
}

export function writePublicContactUtmAttribution(
  storage: Pick<Storage, 'setItem'>,
  values: PublicContactUtmValues,
) {
  const normalizedValues = normalizePublicContactUtmValues(values);

  if (!hasPublicContactUtmValues(normalizedValues)) {
    return;
  }

  storage.setItem(
    PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY,
    JSON.stringify({ version: UTM_ATTRIBUTION_VERSION, ...normalizedValues }),
  );
}

export function clearPublicContactUtmAttribution(storage: Pick<Storage, 'removeItem'>) {
  storage.removeItem(PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY);
}
