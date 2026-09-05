'use client';

import { Analytics } from '@vercel/analytics/next';
import { useEffect, useRef } from 'react';

import { useCookieConsent } from './cookie-consent/cookie-consent-provider';

interface PublicWebAnalyticsProps {
  enabledForProduction: boolean;
}

export function PublicWebAnalytics({ enabledForProduction }: PublicWebAnalyticsProps) {
  const { consent } = useCookieConsent();
  const isEnabled = enabledForProduction && consent.analytics;
  const enabledRef = useRef(isEnabled);

  useEffect(() => {
    enabledRef.current = isEnabled;
  }, [isEnabled]);

  if (!isEnabled) {
    return null;
  }

  return (
    <Analytics mode="production" beforeSend={(event) => (enabledRef.current ? event : null)} />
  );
}
