'use client';

import { useSyncExternalStore } from 'react';

import type { PublicContactUtmValues } from '../types/contact-form-state';
import {
  clearPublicContactUtmAttribution,
  hasPublicContactUtmValues,
  PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY,
  readPublicContactUtmAttribution,
  writePublicContactUtmAttribution,
} from './utm-attribution';

type Listener = () => void;

let snapshot: PublicContactUtmValues | null | undefined;
const listeners = new Set<Listener>();

function getSnapshot() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (snapshot === undefined) {
    try {
      snapshot = readPublicContactUtmAttribution(window.sessionStorage);
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
    if (
      event.storageArea !== window.sessionStorage ||
      event.key !== PUBLIC_UTM_ATTRIBUTION_STORAGE_KEY
    ) {
      return;
    }

    snapshot = readPublicContactUtmAttribution(window.sessionStorage);
    listener();
  }

  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function save(values: PublicContactUtmValues) {
  if (!hasPublicContactUtmValues(values)) {
    return;
  }

  try {
    writePublicContactUtmAttribution(window.sessionStorage, values);
    snapshot = values;
  } catch {
    snapshot = null;
  }

  listeners.forEach((listener) => listener());
}

function clear() {
  try {
    clearPublicContactUtmAttribution(window.sessionStorage);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }

  snapshot = null;
  listeners.forEach((listener) => listener());
}

export const publicUtmAttributionClientStore = {
  getSnapshot,
  getServerSnapshot,
  subscribe,
  save,
  clear,
};

export function usePublicContactUtmAttribution() {
  return useSyncExternalStore(
    publicUtmAttributionClientStore.subscribe,
    publicUtmAttributionClientStore.getSnapshot,
    publicUtmAttributionClientStore.getServerSnapshot,
  );
}
