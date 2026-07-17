'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import {
  addSelectedAuthor,
  filterAvailableAuthors,
  moveSelectedAuthorDown,
  moveSelectedAuthorUp,
  removeSelectedAuthor,
} from '../lib/book-author-selection.helpers';
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
  type BookFormAuthorSummary,
} from '../types/book-form-state';
import { BookFormSectionPlaceholder } from './book-form-section-placeholder';
import { BookAuthorsSection } from './book-authors-section';
import { BookGeneralSection } from './book-general-section';

interface BookFormProps {
  mode?: 'create';
  authors: BookFormAuthorSummary[];
  initialValues?: Partial<BookGeneralFormValues>;
}

function getInitialValues(initialValues?: Partial<BookGeneralFormValues>): BookGeneralFormValues {
  return {
    ...initialBookGeneralFormValues,
    ...initialValues,
  };
}

export function BookForm({ authors, initialValues }: BookFormProps) {
  const stableInitialValues = useMemo(() => getInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState<BookGeneralFormValues>(stableInitialValues);
  const [touched, setTouched] = useState<BookGeneralFormTouched>({});
  const [selectedAuthors, setSelectedAuthors] = useState<BookFormAuthorSummary[]>([]);
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const visibleErrors = getVisibleBookGeneralErrors(values, touched);
  const availableAuthors = filterAvailableAuthors(authors, selectedAuthors, authorSearchQuery);
  const authorError =
    selectedAuthors.length === 0 ? 'Debe seleccionar al menos un autor.' : undefined;
  const isDirty =
    areBookGeneralValuesDirty(values, stableInitialValues) || selectedAuthors.length > 0;

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

  function handleAddAuthor(author: BookFormAuthorSummary) {
    setSelectedAuthors((currentAuthors) => addSelectedAuthor(currentAuthors, author));
  }

  function handleMoveAuthorUp(authorId: string) {
    setSelectedAuthors((currentAuthors) => moveSelectedAuthorUp(currentAuthors, authorId));
  }

  function handleMoveAuthorDown(authorId: string) {
    setSelectedAuthors((currentAuthors) => moveSelectedAuthorDown(currentAuthors, authorId));
  }

  function handleRemoveAuthor(authorId: string) {
    setSelectedAuthors((currentAuthors) => removeSelectedAuthor(currentAuthors, authorId));
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

            <BookAuthorsSection
              authors={availableAuthors}
              selectedAuthors={selectedAuthors}
              searchQuery={authorSearchQuery}
              error={authorError}
              onSearchQueryChange={setAuthorSearchQuery}
              onAddAuthor={handleAddAuthor}
              onMoveAuthorUp={handleMoveAuthorUp}
              onMoveAuthorDown={handleMoveAuthorDown}
              onRemoveAuthor={handleRemoveAuthor}
            />

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
