'use client';

import { useActionState } from 'react';

import { updatePassword } from '@/features/auth/actions/update-password';
import {
  initialUpdatePasswordState,
  type UpdatePasswordState,
} from '@/features/auth/types/password-action-state';

interface UpdatePasswordFormProps {
  redirectTo: string;
  submitLabel?: string;
}

export function UpdatePasswordForm({
  redirectTo,
  submitLabel = 'Actualizar contraseña',
}: UpdatePasswordFormProps) {
  const action = updatePassword.bind(null, { redirectTo });
  const [state, formAction, pending] = useActionState<UpdatePasswordState, FormData>(
    action,
    initialUpdatePasswordState,
  );
  const passwordError = state.fieldErrors.password?.[0];
  const confirmPasswordError = state.fieldErrors.confirmPassword?.[0];

  return (
    <form action={formAction} className="space-y-5">
      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'password-error' : undefined}
        />
        {passwordError ? (
          <p id="password-error" className="text-sm text-red-700">
            {passwordError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-900">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
          aria-invalid={confirmPasswordError ? true : undefined}
          aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
        />
        {confirmPasswordError ? (
          <p id="confirm-password-error" className="text-sm text-red-700">
            {confirmPasswordError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
