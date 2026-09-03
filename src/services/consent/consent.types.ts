export const CONSENT_VERSION = 1;

export interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsentPreferences extends ConsentPreferences {
  version: number;
  decidedAt: string;
}

export const defaultConsentPreferences: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};
