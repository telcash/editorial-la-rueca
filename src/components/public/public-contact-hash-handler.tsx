'use client';

import { useEffect } from 'react';

const PUBLIC_CONTACT_ANCHOR = 'publica-tu-libro';
const PUBLIC_PURCHASE_ANCHOR = 'comprar';
const PUBLIC_CONTACT_FOCUS_FLAG = 'public-contact-focus-requested';
const HIGHLIGHT_DURATION_MS = 1000;

function markContactCtaActivation() {
  try {
    window.sessionStorage.setItem(PUBLIC_CONTACT_FOCUS_FLAG, 'true');
  } catch {
    // Storage can be unavailable in private browsing; scrolling still works.
  }
}

function consumeContactCtaActivation() {
  try {
    const wasActivated = window.sessionStorage.getItem(PUBLIC_CONTACT_FOCUS_FLAG) === 'true';
    window.sessionStorage.removeItem(PUBLIC_CONTACT_FOCUS_FLAG);
    return wasActivated;
  } catch {
    return false;
  }
}

function highlightHashSection(
  anchor: string,
  highlightClass: string,
  shouldFocusName = false,
  formWasInteractedWith = false,
) {
  if (window.location.hash !== `#${anchor}`) {
    return undefined;
  }

  const section = document.getElementById(anchor);
  if (!section) {
    return undefined;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  section.classList.add(highlightClass);

  const shouldAvoidKeyboard =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
  const nameInput = document.getElementById('public-contact-name');
  const form = nameInput?.closest('form');
  const userAlreadyFocusedForm = form?.contains(document.activeElement) ?? false;

  if (
    shouldFocusName &&
    !shouldAvoidKeyboard &&
    !formWasInteractedWith &&
    !userAlreadyFocusedForm &&
    nameInput instanceof HTMLInputElement
  ) {
    nameInput.focus({ preventScroll: true });
  }

  const timeoutId = window.setTimeout(() => {
    section.classList.remove(highlightClass);
  }, HIGHLIGHT_DURATION_MS);

  return () => {
    window.clearTimeout(timeoutId);
    section.classList.remove(highlightClass);
  };
}

export function PublicContactHashHandler() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let formWasInteractedWith = false;
    let samePageFocusPending = false;

    const handleHashChange = () => {
      cleanup?.();
      samePageFocusPending = false;
      const shouldFocusName = consumeContactCtaActivation();
      cleanup =
        window.location.hash === `#${PUBLIC_CONTACT_ANCHOR}`
          ? highlightHashSection(
              PUBLIC_CONTACT_ANCHOR,
              'public-contact-highlight',
              shouldFocusName,
              formWasInteractedWith,
            )
          : highlightHashSection(PUBLIC_PURCHASE_ANCHOR, 'public-purchase-highlight');
    };

    const handleFormFocus = (event: FocusEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('form')?.querySelector('#public-contact-name')
      ) {
        formWasInteractedWith = true;
      }
    };

    const handleCtaActivation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      const isContactCta = url.pathname === '/' && url.hash === `#${PUBLIC_CONTACT_ANCHOR}`;
      const isPurchaseCta = url.pathname === window.location.pathname && url.hash === '#comprar';

      if (isContactCta) {
        markContactCtaActivation();
      }

      const isSamePageCta = (isContactCta && window.location.pathname === '/') || isPurchaseCta;

      if (isSamePageCta) {
        samePageFocusPending = true;
        window.setTimeout(() => {
          if (!samePageFocusPending) {
            return;
          }

          samePageFocusPending = false;
          cleanup?.();
          cleanup = isContactCta
            ? highlightHashSection(
                PUBLIC_CONTACT_ANCHOR,
                'public-contact-highlight',
                true,
                formWasInteractedWith,
              )
            : highlightHashSection(PUBLIC_PURCHASE_ANCHOR, 'public-purchase-highlight');
        }, 0);
      }
    };

    const shouldHighlightCurrentHash = [PUBLIC_CONTACT_ANCHOR, PUBLIC_PURCHASE_ANCHOR].includes(
      window.location.hash.slice(1),
    );
    if (shouldHighlightCurrentHash) {
      handleHashChange();
    }
    document.addEventListener('click', handleCtaActivation);
    document.addEventListener('focusin', handleFormFocus);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      cleanup?.();
      document.removeEventListener('click', handleCtaActivation);
      document.removeEventListener('focusin', handleFormFocus);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return null;
}
