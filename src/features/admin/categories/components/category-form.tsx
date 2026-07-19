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
import { normalizeCategorySlug } from '@/schemas/categories/category.schema';
import { createCategoryAction } from '../actions/create-category';
import { updateCategoryAction } from '../actions/update-category';
import {
  initialCategoryFormState,
  type CategoryFormState,
  type CategoryFormValues,
} from '../types/category-form-state';

interface CategoryFormProps {
  mode?: 'create' | 'edit';
  categoryId?: string;
  initialValues?: CategoryFormValues;
}

function CategoryFormActions({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <FormActions
      cancelHref="/admin/categories"
      submitLabel={submitLabel}
      pendingLabel="Guardando…"
      isPending={pending}
    />
  );
}

function getInitialState(initialValues?: CategoryFormValues): CategoryFormState {
  if (!initialValues) {
    return initialCategoryFormState;
  }

  return {
    ...initialCategoryFormState,
    values: initialValues,
  };
}

export function CategoryForm({ mode = 'create', categoryId, initialValues }: CategoryFormProps) {
  const action =
    mode === 'edit' && categoryId
      ? updateCategoryAction.bind(null, categoryId)
      : createCategoryAction;
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Crear categoría';
  const [state, formAction] = useActionState(action, getInitialState(initialValues));
  const [name, setName] = useState(state.values.name);
  const [slug, setSlug] = useState(state.values.slug);
  const [isSlugManual, setIsSlugManual] = useState(mode === 'edit');

  function handleNameChange(value: string) {
    setName(value);

    if (!isSlugManual) {
      setSlug(normalizeCategorySlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setIsSlugManual(true);
    setSlug(normalizeCategorySlug(value));
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
              title="Información editorial"
              description="Define el nombre público y el estado de publicación de la categoría."
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
                    required
                  />
                  <FieldError message={state.fieldErrors.slug?.[0]} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={state.values.description}
                    rows={5}
                  />
                  <FieldError message={state.fieldErrors.description?.[0]} />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                  <div>
                    <Label htmlFor="isPublished">Publicado</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Las categorías publicadas podrán aparecer en vistas públicas cuando se
                      integren.
                    </p>
                  </div>
                  <Switch
                    id="isPublished"
                    name="isPublished"
                    value="true"
                    defaultChecked={state.values.isPublished}
                  />
                </div>
              </div>
            </FormSection>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <CategoryFormActions submitLabel={submitLabel} />
        </CardFooter>
      </Card>
    </form>
  );
}
