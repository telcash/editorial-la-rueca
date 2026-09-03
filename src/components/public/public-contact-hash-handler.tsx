'use client';

import { useEffect } from 'react';

const PUBLIC_CONTACT_ANCHOR = 'publica-tu-libro';
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

function focusContactSection(shouldFocusName: boolean, formWasInteractedWith: boolean) {
  if (window.location.hash !== `#${PUBLIC_CONTACT_ANCHOR}`) {
    return undefined;
  }

  const section = document.getElementById(PUBLIC_CONTACT_ANCHOR);
  if (!section) {
    return undefined;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  section.classList.add('public-contact-highlight');

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
    section.classList.remove('public-contact-highlight');
  }, HIGHLIGHT_DURATION_MS);

  return () => {
    window.clearTimeout(timeoutId);
    section.classList.remove('public-contact-highlight');
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
      cleanup = focusContactSection(consumeContactCtaActivation(), formWasInteractedWith);
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
      if (url.pathname === '/' && url.hash === `#${PUBLIC_CONTACT_ANCHOR}`) {
        markContactCtaActivation();

        if (window.location.pathname === '/') {
          samePageFocusPending = true;
          window.setTimeout(() => {
            if (!samePageFocusPending) {
              return;
            }

            samePageFocusPending = false;
            cleanup?.();
            cleanup = focusContactSection(true, formWasInteractedWith);
          }, 0);
        }
      }
    };

    const shouldHighlightCurrentHash = window.location.hash === `#${PUBLIC_CONTACT_ANCHOR}`;
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
