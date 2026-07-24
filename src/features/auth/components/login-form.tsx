'use client';

import { useActionState } from 'react';
import Link from 'next/link';

import { signIn } from '@/features/auth/actions/sign-in';
import { initialSignInState } from '@/features/auth/types/sign-in-state';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialSignInState);
  const emailError = state.fieldErrors?.email?.[0];
  const passwordError = state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
          Correo electronico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
        {emailError ? <p className="text-sm text-red-700">{emailError}</p> : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
            Contraseña
          </label>
          <Link
            href="/login/forgot-password"
            className="text-xs font-medium text-neutral-700 underline-offset-4 hover:underline"
          >
            ¿Has olvidado tu contraseña?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
        />
        {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
      </div>

      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
