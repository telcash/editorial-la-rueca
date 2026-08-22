'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { FormSection } from '@/features/admin/components/forms/form-section';
import { normalizeServiceSlug } from '@/schemas/editorial-services/editorial-service.schema';
import { createServiceAction } from '../actions/create-service';
import { updateServiceAction } from '../actions/update-service';
import {
  initialServiceFormState,
  type ServiceFormState,
  type ServiceFormValues,
} from '../types/service-form-state';

interface ServiceFormProps {
  mode?: 'create' | 'edit';
  serviceId?: string;
  initialValues?: ServiceFormValues;
}

function ServiceFormActions({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <FormActions
      cancelHref="/admin/services"
      submitLabel={submitLabel}
      pendingLabel="Guardando…"
      isPending={pending}
    />
  );
}

function getInitialState(initialValues?: ServiceFormValues): ServiceFormState {
  if (!initialValues) {
    return initialServiceFormState;
  }

  return {
    ...initialServiceFormState,
    values: initialValues,
  };
}

export function ServiceForm({ mode = 'create', serviceId, initialValues }: ServiceFormProps) {
  const action =
    mode === 'edit' && serviceId ? updateServiceAction.bind(null, serviceId) : createServiceAction;
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Crear servicio';
  const [state, formAction] = useActionState(action, getInitialState(initialValues));
  const [name, setName] = useState(state.values.name);
  const [slug, setSlug] = useState(state.values.slug);
  const [isSlugManual, setIsSlugManual] = useState(mode === 'edit');

  function handleNameChange(value: string) {
    setName(value);

    if (!isSlugManual) {
      setSlug(normalizeServiceSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setIsSlugManual(true);
    setSlug(normalizeServiceSlug(value));
  }

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
              title="Información comercial"
              description="Define el servicio, su resumen público y el orden editorial."
            >
              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <FieldError message={state.fieldErrors.name?.[0]} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                    autoComplete="off"
                    placeholder="Déjalo vacío para generarlo automáticamente"
                  />
                  <p className="text-xs text-muted-foreground">
                    Déjalo vacío para generarlo automáticamente a partir del nombre.
                  </p>
                  <FieldError message={state.fieldErrors.slug?.[0]} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="shortDescription">Descripción corta</Label>
                  <Textarea
                    id="shortDescription"
                    name="shortDescription"
                    defaultValue={state.values.shortDescription}
                    rows={3}
                  />
                  <FieldError message={state.fieldErrors.shortDescription?.[0]} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={state.values.description}
                    rows={6}
                  />
                  <FieldError message={state.fieldErrors.description?.[0]} />
                </div>

                <div className="grid gap-2 sm:max-w-40">
                  <Label htmlFor="sortOrder">Orden</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    step="1"
                    defaultValue={state.values.sortOrder}
                  />
                  <FieldError message={state.fieldErrors.sortOrder?.[0]} />
                </div>

                <div className="grid gap-3">
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div>
                      <Label htmlFor="isPublished">Publicado</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Solo los servicios publicados estarán disponibles para futuras vistas y
                        formularios públicos.
                      </p>
                    </div>
                    <Switch
                      id="isPublished"
                      name="isPublished"
                      value="true"
                      defaultChecked={state.values.isPublished}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div>
                      <Label htmlFor="isFeatured">Destacado</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Marca servicios prioritarios para futuras secciones editoriales o
                        promociones.
                      </p>
                    </div>
                    <Switch
                      id="isFeatured"
                      name="isFeatured"
                      value="true"
                      defaultChecked={state.values.isFeatured}
                    />
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <ServiceFormActions submitLabel={submitLabel} />
        </CardFooter>
      </Card>
    </form>
  );
}
