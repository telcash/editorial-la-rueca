'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useCookieConsent } from './cookie-consent/cookie-consent-provider';
import {
  getPublicContactUtmValuesFromSearchParams,
  hasPublicContactUtmValues,
} from '@/features/public/contact/lib/utm-attribution';
import { publicUtmAttributionClientStore } from '@/features/public/contact/lib/utm-attribution-client-store';

export function PublicUtmAttribution() {
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!consent.analytics) {
      publicUtmAttributionClientStore.clear();
      return;
    }

    const values = getPublicContactUtmValuesFromSearchParams(searchParams);

    if (hasPublicContactUtmValues(values)) {
      publicUtmAttributionClientStore.save(values);
    }
  }, [consent.analytics, pathname, searchParams]);

  return null;
}
