'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Send } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { submitPublicContactAction } from '../actions/submit-public-contact';
import { initialPublicContactFormState } from '../types/contact-form-state';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-public-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Enviando…' : 'Solicitar asesoría'}
      <Send className="size-4" aria-hidden="true" />
    </button>
  );
}

export function PublicContactForm() {
  const [state, formAction] = useActionState(
    submitPublicContactAction,
    initialPublicContactFormState,
  );
  const formKey = state.success ? 'success' : JSON.stringify(state.values);

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      {state.success ? (
        <div
          role="status"
          className="rounded-xl border border-public-red/20 bg-public-red-soft px-4 py-3 text-sm font-medium text-public-red"
        >
          Hemos recibido correctamente los datos del formulario.
        </div>
      ) : null}

      {state.formError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {state.formError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="public-contact-name">Nombre</Label>
          <Input
            id="public-contact-name"
            name="name"
            defaultValue={state.values.name}
            aria-invalid={Boolean(state.fieldErrors.name?.[0])}
            aria-describedby={state.fieldErrors.name?.[0] ? 'public-contact-name-error' : undefined}
            className="h-11 bg-white"
            autoComplete="name"
          />
          <FieldError id="public-contact-name-error" message={state.fieldErrors.name?.[0]} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="public-contact-email">Email</Label>
          <Input
            id="public-contact-email"
            name="email"
            type="email"
            defaultValue={state.values.email}
            aria-invalid={Boolean(state.fieldErrors.email?.[0])}
            aria-describedby={
              state.fieldErrors.email?.[0] ? 'public-contact-email-error' : undefined
            }
            className="h-11 bg-white"
            autoComplete="email"
          />
          <FieldError id="public-contact-email-error" message={state.fieldErrors.email?.[0]} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="public-contact-phone">Teléfono</Label>
        <Input
          id="public-contact-phone"
          name="phone"
          defaultValue={state.values.phone}
          aria-invalid={Boolean(state.fieldErrors.phone?.[0])}
          aria-describedby={state.fieldErrors.phone?.[0] ? 'public-contact-phone-error' : undefined}
          className="h-11 bg-white"
          autoComplete="tel"
        />
        <FieldError id="public-contact-phone-error" message={state.fieldErrors.phone?.[0]} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="public-contact-message">Cuéntanos brevemente sobre tu libro</Label>
        <Textarea
          id="public-contact-message"
          name="message"
          defaultValue={state.values.message}
          aria-invalid={Boolean(state.fieldErrors.message?.[0])}
          aria-describedby={
            state.fieldErrors.message?.[0] ? 'public-contact-message-error' : undefined
          }
          className="min-h-28 bg-white"
        />
        <FieldError id="public-contact-message-error" message={state.fieldErrors.message?.[0]} />
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 text-sm leading-6 text-public-muted">
          <input
            type="checkbox"
            name="privacyAccepted"
            value="true"
            defaultChecked={state.values.privacyAccepted}
            aria-invalid={Boolean(state.fieldErrors.privacyAccepted?.[0])}
            aria-describedby={
              state.fieldErrors.privacyAccepted?.[0] ? 'public-contact-privacy-error' : undefined
            }
            className={cn(
              'mt-1 size-4 rounded border-public-border text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2',
              state.fieldErrors.privacyAccepted?.[0] && 'border-destructive',
            )}
          />
          <span>
            He leído y acepto la{' '}
            <Link
              href="/politica-de-privacidad"
              className="font-semibold text-public-red underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
            >
              política de privacidad
            </Link>
            .
          </span>
        </label>
        <FieldError
          id="public-contact-privacy-error"
          message={state.fieldErrors.privacyAccepted?.[0]}
        />
      </div>

      <SubmitButton />
    </form>
  );
}
