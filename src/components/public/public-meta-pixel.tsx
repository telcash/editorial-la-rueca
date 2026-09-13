'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { useCookieConsent } from './cookie-consent/cookie-consent-provider';

export const META_PIXEL_SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

const META_PIXEL_ID_PATTERN = /^\d{5,20}$/;

type MetaPixelFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

interface MetaPixelRuntime {
  initializedPixelId: string | null;
  scriptPromise: Promise<void> | null;
}

const runtime: MetaPixelRuntime = {
  initializedPixelId: null,
  scriptPromise: null,
};

export function isValidMetaPixelId(value: string | undefined): value is string {
  return value !== undefined && META_PIXEL_ID_PATTERN.test(value);
}

export function shouldEnableMetaPixel(
  enabledForProduction: boolean,
  marketingConsent: boolean,
  pixelId: string | undefined,
): boolean {
  return enabledForProduction && marketingConsent && isValidMetaPixelId(pixelId);
}

export function getMetaPixelRouteKey(pathname: string | null): string {
  return pathname ?? '';
}

function getOrCreateFbq(): MetaPixelFunction {
  if (window.fbq) {
    return window.fbq;
  }

  const fbq = ((...args: unknown[]) => {
    fbq.queue?.push(args);
  }) as MetaPixelFunction;

  fbq.push = fbq;
  fbq.loaded = false;
  fbq.version = '2.0';
  fbq.queue = [];
  window.fbq = fbq;

  return fbq;
}

function loadMetaPixelScript(): Promise<void> {
  if (runtime.scriptPromise) {
    return runtime.scriptPromise;
  }

  runtime.scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-editorial-meta-pixel="true"]',
    );

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Meta Pixel script failed to load.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = META_PIXEL_SCRIPT_SRC;
    script.dataset.editorialMetaPixel = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Meta Pixel script failed to load.'));
    document.head.appendChild(script);
  });

  return runtime.scriptPromise;
}

async function initializeMetaPixel(pixelId: string) {
  const fbq = getOrCreateFbq();

  if (runtime.initializedPixelId !== pixelId) {
    fbq('init', pixelId);
    runtime.initializedPixelId = pixelId;
  }

  await loadMetaPixelScript();
}

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

interface PublicMetaPixelProps {
  enabledForProduction: boolean;
}

export function PublicMetaPixel({ enabledForProduction }: PublicMetaPixelProps) {
  const { consent } = useCookieConsent();
  const pathname = usePathname();
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const isEnabled = shouldEnableMetaPixel(enabledForProduction, consent.marketing, pixelId);
  const enabledRef = useRef(isEnabled);
  const lastTrackedRouteRef = useRef<string | null>(null);
  const routeKey = getMetaPixelRouteKey(pathname);

  useEffect(() => {
    enabledRef.current = isEnabled;

    if (!isEnabled) {
      lastTrackedRouteRef.current = null;
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !pixelId) {
      return;
    }

    let cancelled = false;

    void initializeMetaPixel(pixelId)
      .then(() => {
        if (
          cancelled ||
          !enabledRef.current ||
          lastTrackedRouteRef.current === routeKey ||
          !window.fbq
        ) {
          return;
        }

        window.fbq('track', 'PageView');
        lastTrackedRouteRef.current = routeKey;
      })
      .catch(() => {
        console.warn('[PublicMetaPixel] Unable to load Meta Pixel.');
      });

    return () => {
      cancelled = true;
    };
  }, [isEnabled, pixelId, routeKey]);

  return null;
}
