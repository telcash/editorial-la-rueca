import { CONSENT_STORAGE_KEY, createStoredConsent, readStoredConsent } from './consent-storage';
import type { ConsentPreferences, StoredConsentPreferences } from './consent.types';

type Listener = () => void;

let snapshot: StoredConsentPreferences | null | undefined;
const listeners = new Set<Listener>();

function getSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (snapshot === undefined) {
    try {
      snapshot = readStoredConsent(window.localStorage);
    } catch {
      snapshot = null;
    }
  }

  return snapshot;
}

function getServerSnapshot() {
  return null;
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === CONSENT_STORAGE_KEY) {
      try {
        snapshot = readStoredConsent(window.localStorage);
      } catch {
        snapshot = null;
      }
      listener();
    }
  }

  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function saveConsent(preferences: ConsentPreferences) {
  const nextSnapshot = createStoredConsent(preferences);

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(nextSnapshot));
  } catch {
    // Keep the current decision in memory when browser storage is unavailable.
  }
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

export const consentClientStore = {
  getSnapshot,
  getServerSnapshot,
  subscribe,
  saveConsent,
};
