'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import {
  areBookGeneralValuesDirty,
  getVisibleBookGeneralErrors,
  resetSlugFromTitle,
  updateValuesFromManualSlug,
  updateValuesFromTitle,
} from '../lib/book-form.helpers';
import {
  initialBookGeneralFormValues,
  type BookGeneralFormField,
  type BookGeneralFormTouched,
  type BookGeneralFormValues,
} from '../types/book-form-state';
import { BookFormSectionPlaceholder } from './book-form-section-placeholder';
import { BookGeneralSection } from './book-general-section';

interface BookFormProps {
  mode?: 'create';
  initialValues?: Partial<BookGeneralFormValues>;
}

function getInitialValues(initialValues?: Partial<BookGeneralFormValues>): BookGeneralFormValues {
  return {
    ...initialBookGeneralFormValues,
    ...initialValues,
  };
}

export function BookForm({ initialValues }: BookFormProps) {
  const stableInitialValues = useMemo(() => getInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState<BookGeneralFormValues>(stableInitialValues);
  const [touched, setTouched] = useState<BookGeneralFormTouched>({});
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const visibleErrors = getVisibleBookGeneralErrors(values, touched);
  const isDirty = areBookGeneralValuesDirty(values, stableInitialValues);

  function handleTextChange(field: BookGeneralFormField, value: string) {
    setValues((currentValues) => {
      if (field === 'title') {
        return updateValuesFromTitle(currentValues, value, isSlugManuallyEdited);
      }

      if (field === 'slug') {
        setIsSlugManuallyEdited(true);
        return updateValuesFromManualSlug(currentValues, value);
      }

      return {
        ...currentValues,
        [field]: value,
      };
    });
  }

  function handleBooleanChange(field: 'isPublished' | 'isFeatured', value: boolean) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function handleFieldBlur(field: BookGeneralFormField) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [field]: true,
    }));
  }

  function handleSlugReset() {
    setValues((currentValues) => resetSlugFromTitle(currentValues));
    setIsSlugManuallyEdited(false);
    setTouched((currentTouched) => ({
      ...currentTouched,
      slug: true,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <BookGeneralSection
              values={values}
              errors={visibleErrors}
              touched={touched}
              isSlugManuallyEdited={isSlugManuallyEdited}
              onTextChange={handleTextChange}
              onBooleanChange={handleBooleanChange}
              onFieldBlur={handleFieldBlur}
              onSlugReset={handleSlugReset}
            />

            <BookFormSectionPlaceholder
              title="Autores"
              description="Selecciona uno o varios autores y define el orden en el que aparecerán."
            >
              Este bloque se implementará en el siguiente sub-sprint.
            </BookFormSectionPlaceholder>

            <BookFormSectionPlaceholder
              title="Ediciones y precios"
              description="Añade los formatos comerciales, precios, ISBN y disponibilidad."
            >
              Este bloque se implementará en el tercer sub-sprint.
            </BookFormSectionPlaceholder>

            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Completa autores y ediciones para guardar el libro.
              {isDirty ? <span className="ml-2 font-medium">Hay cambios sin guardar.</span> : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <FormActions
            cancelHref="/admin/books"
            submitLabel="Guardar libro"
            pendingLabel="Guardando…"
            isPending={false}
            disabled
            submitTitle="Completa autores y ediciones para guardar el libro."
          />
        </CardFooter>
      </Card>
    </form>
  );
}
