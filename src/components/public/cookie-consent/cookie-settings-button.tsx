'use client';

import { useCookieConsent } from './cookie-consent-provider';

export function CookieSettingsButton() {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className="text-left transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
    >
      Configurar cookies
    </button>
  );
}
