'use client';

import { useEffect, useRef, useState } from 'react';

import type { ConsentPreferences } from '@/services/consent/consent.types';
import { useCookieConsent } from './cookie-consent-provider';

interface CookieSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
}

export function CookieSettingsDialog({ onOpenChange }: CookieSettingsDialogProps) {
  const { consent, acceptAll, rejectAll, savePreferences } = useCookieConsent();
  const [draft, setDraft] = useState<ConsentPreferences>(consent);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-black/35 p-3 sm:items-center sm:justify-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        className="max-h-[calc(100vh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-public-border bg-white p-6 shadow-public-elevated sm:max-h-[calc(100vh-3rem)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-public-label font-bold uppercase text-public-red">Preferencias</p>
            <h2
              id="cookie-settings-title"
              className="mt-2 font-serif-public text-2xl font-semibold text-public-ink"
            >
              Configurar cookies
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar configuración de cookies"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-public-border text-xl text-public-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-7 divide-y divide-public-border-soft border-y border-public-border-soft">
          <ConsentOption
            title="Cookies necesarias"
            description="Necesarias para el funcionamiento básico y seguro del sitio."
            checked
            disabled
          />
          <ConsentOption
            title="Cookies de analítica"
            description="Nos permiten conocer de forma agregada cómo se utiliza la web y mejorar su funcionamiento."
            checked={draft.analytics}
            onChange={(checked) => setDraft((current) => ({ ...current, analytics: checked }))}
          />
          <ConsentOption
            title="Cookies de marketing"
            description="Permiten medir campañas y, cuando corresponda, personalizar acciones de marketing."
            checked={draft.marketing}
            onChange={(checked) => setDraft((current) => ({ ...current, marketing: checked }))}
          />
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={rejectAll}
            className="min-h-11 rounded-lg border border-public-border-interactive px-4 py-2 text-sm font-semibold text-public-ink hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            Rechazar todas
          </button>
          <button
            type="button"
            onClick={() => savePreferences(draft)}
            className="min-h-11 rounded-lg border border-public-red px-4 py-2 text-sm font-semibold text-public-red hover:bg-public-red-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
          >
            Guardar selección
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="min-h-11 rounded-lg bg-public-red px-4 py-2 text-sm font-semibold text-white hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConsentOptionProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}

function ConsentOption({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: ConsentOptionProps) {
  return (
    <label className="flex items-start justify-between gap-5 py-5">
      <span>
        <span className="block font-semibold text-public-ink">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-public-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-1 size-5 shrink-0 accent-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:opacity-60"
      />
    </label>
  );
}
