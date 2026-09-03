'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { consentClientStore } from '@/services/consent/consent-client-store';
import { getDefaultConsentPreferences } from '@/services/consent/consent-storage';
import type { ConsentPreferences } from '@/services/consent/consent.types';
import { CookieBanner } from './cookie-banner';
import { CookieSettingsDialog } from './cookie-settings-dialog';

interface ConsentContextValue {
  consent: ConsentPreferences;
  hasDecision: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  savePreferences: (preferences: ConsentPreferences) => void;
  openSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const storedConsent = useSyncExternalStore(
    consentClientStore.subscribe,
    consentClientStore.getSnapshot,
    consentClientStore.getServerSnapshot,
  );
  const consent = storedConsent ?? getDefaultConsentPreferences();
  const hasDecision = storedConsent !== null;
  const [settingsOpen, setSettingsOpen] = useState(false);

  function savePreferences(preferences: ConsentPreferences) {
    const nextConsent: ConsentPreferences = {
      necessary: true,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    };

    consentClientStore.saveConsent(nextConsent);
    setSettingsOpen(false);
  }

  const contextValue = useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasDecision,
      acceptAll: () => savePreferences({ necessary: true, analytics: true, marketing: true }),
      rejectAll: () => savePreferences({ necessary: true, analytics: false, marketing: false }),
      savePreferences,
      openSettings: () => setSettingsOpen(true),
    }),
    [consent, hasDecision],
  );

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
      {!hasDecision ? <CookieBanner /> : null}
      {settingsOpen ? <CookieSettingsDialog onOpenChange={setSettingsOpen} /> : null}
    </ConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(ConsentContext);

  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }

  return context;
}
