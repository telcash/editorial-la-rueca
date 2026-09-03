import {
  CONSENT_VERSION,
  defaultConsentPreferences,
  type ConsentPreferences,
  type StoredConsentPreferences,
} from './consent.types';

export const CONSENT_STORAGE_KEY = 'editorial-la-rueca:cookie-consent';

function isStoredConsentPreferences(value: unknown): value is StoredConsentPreferences {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StoredConsentPreferences>;

  return (
    candidate.version === CONSENT_VERSION &&
    typeof candidate.decidedAt === 'string' &&
    candidate.necessary === true &&
    typeof candidate.analytics === 'boolean' &&
    typeof candidate.marketing === 'boolean'
  );
}

export function readStoredConsent(
  storage: Pick<Storage, 'getItem'>,
): StoredConsentPreferences | null {
  const rawValue = storage.getItem(CONSENT_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return isStoredConsentPreferences(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function createStoredConsent(
  preferences: ConsentPreferences,
  decidedAt = new Date().toISOString(),
): StoredConsentPreferences {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    decidedAt,
  };
}

export function writeStoredConsent(
  storage: Pick<Storage, 'setItem'>,
  preferences: ConsentPreferences,
  decidedAt?: string,
) {
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(createStoredConsent(preferences, decidedAt)));
}

export function getDefaultConsentPreferences() {
  return { ...defaultConsentPreferences };
}
