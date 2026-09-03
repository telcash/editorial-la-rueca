import { describe, expect, it } from 'vitest';

import {
  CONSENT_STORAGE_KEY,
  createStoredConsent,
  readStoredConsent,
  writeStoredConsent,
} from './consent-storage';

describe('consent storage', () => {
  it('creates and reads versioned preferences', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    writeStoredConsent(
      storage,
      { necessary: true, analytics: true, marketing: false },
      '2026-09-03',
    );

    expect(readStoredConsent(storage)).toEqual({
      ...createStoredConsent({ necessary: true, analytics: true, marketing: false }, '2026-09-03'),
    });
    expect(values.has(CONSENT_STORAGE_KEY)).toBe(true);
  });

  it('rejects malformed or outdated preferences', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({ version: 0, necessary: true, analytics: true, marketing: true }),
    };

    expect(readStoredConsent(storage)).toBeNull();
  });
});
