'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Send } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface PublicContactFormServiceOption {
  id: string;
  name: string;
}

interface PublicContactFormProps {
  services: PublicContactFormServiceOption[];
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-public-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Enviando…' : 'Solicitar información'}
      <Send className="size-4" aria-hidden="true" />
    </button>
  );
}

export function PublicContactForm({ services }: PublicContactFormProps) {
  const [state, formAction] = useActionState(
    submitPublicContactAction,
    initialPublicContactFormState,
  );
  const formKey = state.success ? 'success' : JSON.stringify(state.values);
  const hasServices = services.length > 0;

  return (
    <form key={formKey} action={formAction} className="space-y-5" noValidate>
      {state.success ? (
        <div
          role="status"
          className="rounded-xl border border-public-red/20 bg-public-red-soft px-4 py-3 text-sm font-medium text-public-red"
        >
          Gracias. Hemos recibido tu consulta y nos pondremos en contacto contigo.
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

      <div className="hidden" aria-hidden="true">
        <Label htmlFor="public-contact-company">Empresa</Label>
        <Input
          id="public-contact-company"
          name="company"
          defaultValue={state.values.company}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {!hasServices ? (
        <div
          role="status"
          className="rounded-xl border border-public-border bg-public-paper px-4 py-3 text-sm font-medium text-public-muted"
        >
          En este momento no hay servicios publicados para recibir solicitudes.
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="public-contact-phone">Teléfono</Label>
          <Input
            id="public-contact-phone"
            name="phone"
            defaultValue={state.values.phone}
            aria-invalid={Boolean(state.fieldErrors.phone?.[0])}
            aria-describedby={
              state.fieldErrors.phone?.[0] ? 'public-contact-phone-error' : undefined
            }
            className="h-11 bg-white"
            autoComplete="tel"
          />
          <FieldError id="public-contact-phone-error" message={state.fieldErrors.phone?.[0]} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="public-contact-province">Provincia</Label>
          <Input
            id="public-contact-province"
            name="province"
            defaultValue={state.values.province}
            aria-invalid={Boolean(state.fieldErrors.province?.[0])}
            aria-describedby={
              state.fieldErrors.province?.[0] ? 'public-contact-province-error' : undefined
            }
            className="h-11 bg-white"
            autoComplete="address-level2"
          />
          <FieldError
            id="public-contact-province-error"
            message={state.fieldErrors.province?.[0]}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="public-contact-service">Servicio de interés</Label>
        <select
          id="public-contact-service"
          name="serviceId"
          defaultValue={state.values.serviceId}
          disabled={!hasServices}
          aria-invalid={Boolean(state.fieldErrors.serviceId?.[0])}
          aria-describedby={
            state.fieldErrors.serviceId?.[0] ? 'public-contact-service-error' : undefined
          }
          className="min-h-11 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecciona un servicio</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <FieldError id="public-contact-service-error" message={state.fieldErrors.serviceId?.[0]} />
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

      <p className="text-xs leading-5 text-public-muted">
        <span className="font-semibold text-public-ink">Protección de datos:</span> Responsable:
        Almudena Jiménez Fernández (Editorial La Rueca). Usaremos tus datos para gestionar y
        responder tu solicitud sobre servicios editoriales. Puedes ejercer tus derechos escribiendo
        a{' '}
        <a
          href="mailto:ajimenez@editoriallarueca.com"
          className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
        >
          ajimenez@editoriallarueca.com
        </a>
        . Más información en la{' '}
        <Link
          href="/politica-de-privacidad"
          className="font-semibold text-public-red underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red"
        >
          Política de privacidad
        </Link>
        .
      </p>

      <SubmitButton disabled={!hasServices} />
    </form>
  );
}
