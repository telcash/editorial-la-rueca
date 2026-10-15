'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { FormSection } from '@/features/admin/components/forms/form-section';
import type { EditorialService } from '@/db/schema';
import { updateContactRequestServiceAction } from '../actions/update-contact-request';
import {
  initialContactRequestAdminFormState,
  type ContactRequestAdminFormState,
  type ContactRequestAdminFormValues,
} from '../types/contact-request-admin-form-state';

interface ContactRequestAdminFormProps {
  contactRequestId: string;
  initialValues: ContactRequestAdminFormValues;
  services: Pick<EditorialService, 'id' | 'name'>[];
}

function ContactRequestAdminFormActions() {
  const { pending } = useFormStatus();

  return (
    <FormActions
      cancelHref="/admin/contact-requests"
      submitLabel="Guardar cambios"
      pendingLabel="Guardando…"
      isPending={pending}
    />
  );
}

function getInitialState(
  initialValues: ContactRequestAdminFormValues,
): ContactRequestAdminFormState {
  return {
    ...initialContactRequestAdminFormState,
    values: initialValues,
  };
}

export function ContactRequestAdminForm({
  contactRequestId,
  initialValues,
  services,
}: ContactRequestAdminFormProps) {
  const action = updateContactRequestServiceAction.bind(null, contactRequestId);
  const [state, formAction] = useActionState(action, getInitialState(initialValues));

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {state.formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {state.formError}
              </div>
            ) : null}

            <FormSection
              title="Clasificación administrativa"
              description="El estado y las notas se gestionan en el seguimiento histórico."
            >
              <div className="grid gap-5">
                <div className="grid gap-2 sm:max-w-md">
                  <Label htmlFor="serviceId">Servicio</Label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    defaultValue={state.values.serviceId}
                    className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sin clasificar</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <FieldError message={state.fieldErrors.serviceId?.[0]} />
                </div>
              </div>
            </FormSection>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <ContactRequestAdminFormActions />
        </CardFooter>
      </Card>
    </form>
  );
}
