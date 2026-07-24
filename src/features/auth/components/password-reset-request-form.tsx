'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { requestPasswordReset } from '@/features/auth/actions/request-password-reset';
import {
  initialPasswordResetRequestState,
  type PasswordResetRequestState,
} from '@/features/auth/types/password-action-state';

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState<PasswordResetRequestState, FormData>(
    requestPasswordReset,
    initialPasswordResetRequestState,
  );
  const emailError = state.fieldErrors.email?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {state.success ? (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
        >
          Si el correo pertenece a una cuenta del panel, recibirás un enlace para restablecer la
          contraseña.
        </div>
      ) : null}

      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values.email}
          required
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'email-error' : undefined}
        />
        {emailError ? (
          <p id="email-error" className="text-sm text-red-700">
            {emailError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </button>

      <Link
        href="/login"
        className="block text-center text-sm font-medium text-neutral-700 underline-offset-4 hover:underline"
      >
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
