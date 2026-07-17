'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { createBookAction } from '../actions/create-book';
import {
  addSelectedAuthor,
  filterAvailableAuthors,
  moveSelectedAuthorDown,
  moveSelectedAuthorUp,
  removeSelectedAuthor,
} from '../lib/book-author-selection.helpers';
import {
  addEdition,
  buildCreateBookPayload,
  createEmptyEdition,
  getAllEditionFieldsTouched,
  getAuthorsErrorFromPathErrors,
  getEditionErrorsFromPathErrors,
  getEditionsErrorFromPathErrors,
  getGeneralErrorsFromPathErrors,
  getVisibleEditionErrors,
  removeEdition,
  updateEdition,
  validateCreateBookPayload,
} from '../lib/book-edition-form.helpers';
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
  type BookEditionFormField,
  type BookEditionFormTouchedById,
  type BookEditionFormValues,
  type BookFormAuthorSummary,
} from '../types/book-form-state';
import type { CreateBookActionState } from '../types/create-book-action-state';
import { BookAuthorsSection } from './book-authors-section';
import { BookEditionsSection } from './book-editions-section';
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
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<BookGeneralFormValues>(stableInitialValues);
  const [touched, setTouched] = useState<BookGeneralFormTouched>({});
  const [selectedAuthors, setSelectedAuthors] = useState<BookFormAuthorSummary[]>([]);
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [editions, setEditions] = useState<BookEditionFormValues[]>(() => [createEmptyEdition()]);
  const [editionTouched, setEditionTouched] = useState<BookEditionFormTouchedById>({});
  const [clientPathErrors, setClientPathErrors] = useState<Record<string, string>>({});
  const [serverState, setServerState] = useState<CreateBookActionState | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const availableAuthors = filterAvailableAuthors(authors, selectedAuthors, authorSearchQuery);
  const submitGeneralErrors = getGeneralErrorsFromPathErrors(clientPathErrors);
  const visibleGeneralErrors = {
    ...getVisibleBookGeneralErrors(values, touched),
    ...submitGeneralErrors,
    ...(serverState ? getGeneralErrorsFromPathErrors(serverState.pathErrors) : {}),
  };
  const clientEditionErrors = getEditionErrorsFromPathErrors(clientPathErrors, editions);
  const visibleEditionErrors = {
    ...getVisibleEditionErrors(
      getEditionErrorsFromPathErrors(
        validateCreateBookPayload(buildCreateBookPayload(values, selectedAuthors, editions)),
        editions,
      ),
      editionTouched,
    ),
    ...clientEditionErrors,
    ...(serverState ? getEditionErrorsFromPathErrors(serverState.pathErrors, editions) : {}),
  };
  const authorError =
    getAuthorsErrorFromPathErrors(clientPathErrors) ??
    serverState?.authorsError ??
    (selectedAuthors.length === 0 ? 'Debe seleccionar al menos un autor.' : undefined);
  const editionsError =
    getEditionsErrorFromPathErrors(clientPathErrors) ??
    serverState?.editionsError ??
    (editions.length === 0 ? 'Debe añadir al menos una edición.' : undefined);
  const currentPathErrors = validateCreateBookPayload(
    buildCreateBookPayload(values, selectedAuthors, editions),
  );
  const hasClientErrors = Object.keys(currentPathErrors).length > 0;
  const canSubmit = selectedAuthors.length > 0 && editions.length > 0 && !hasClientErrors;
  const hasEditionChanges =
    editions.length !== 1 ||
    editions.some(
      (edition) =>
        edition.format !== 'paperback' ||
        edition.editionLabel !== '' ||
        edition.publicationDate !== '' ||
        edition.isbn10 !== '' ||
        edition.isbn13 !== '' ||
        edition.price !== '' ||
        edition.currency !== 'EUR' ||
        edition.pages !== '' ||
        edition.isAvailable !== true ||
        edition.isFeatured !== false ||
        edition.sortOrder !== '0',
    );
  const isDirty =
    areBookGeneralValuesDirty(values, stableInitialValues) ||
    selectedAuthors.length > 0 ||
    hasEditionChanges;

  function handleTextChange(field: BookGeneralFormField, value: string) {
    setServerState(null);
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
    setServerState(null);
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
    setServerState(null);
    setValues((currentValues) => resetSlugFromTitle(currentValues));
    setIsSlugManuallyEdited(false);
    setTouched((currentTouched) => ({
      ...currentTouched,
      slug: true,
    }));
  }

  function handleAddAuthor(author: BookFormAuthorSummary) {
    if (isPending) {
      return;
    }

    setServerState(null);
    setSelectedAuthors((currentAuthors) => addSelectedAuthor(currentAuthors, author));
  }

  function handleMoveAuthorUp(authorId: string) {
    if (isPending) {
      return;
    }

    setServerState(null);
    setSelectedAuthors((currentAuthors) => moveSelectedAuthorUp(currentAuthors, authorId));
  }

  function handleMoveAuthorDown(authorId: string) {
    if (isPending) {
      return;
    }

    setServerState(null);
    setSelectedAuthors((currentAuthors) => moveSelectedAuthorDown(currentAuthors, authorId));
  }

  function handleRemoveAuthor(authorId: string) {
    if (isPending) {
      return;
    }

    setServerState(null);
    setSelectedAuthors((currentAuthors) => removeSelectedAuthor(currentAuthors, authorId));
  }

  function handleAddEdition() {
    if (isPending) {
      return;
    }

    setServerState(null);
    setEditions((currentEditions) => addEdition(currentEditions));
  }

  function handleRemoveEdition(clientId: string) {
    if (isPending) {
      return;
    }

    setServerState(null);
    setEditions((currentEditions) => removeEdition(currentEditions, clientId));
    setEditionTouched((currentTouched) =>
      Object.fromEntries(Object.entries(currentTouched).filter(([key]) => key !== clientId)),
    );
  }

  function handleUpdateEdition(
    clientId: string,
    field: BookEditionFormField,
    value: string | boolean,
  ) {
    setServerState(null);
    setEditions((currentEditions) => updateEdition(currentEditions, clientId, field, value));
  }

  function handleEditionFieldBlur(clientId: string, field: BookEditionFormField) {
    setEditionTouched((currentTouched) => ({
      ...currentTouched,
      [clientId]: {
        ...currentTouched[clientId],
        [field]: true,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildCreateBookPayload(values, selectedAuthors, editions);
    const pathErrors = validateCreateBookPayload(payload);

    setTouched({
      title: true,
      subtitle: true,
      slug: true,
      description: true,
      excerpt: true,
      originalPublicationDate: true,
      language: true,
      isPublished: true,
      isFeatured: true,
      sortOrder: true,
      metaTitle: true,
      metaDescription: true,
      canonicalUrl: true,
    });
    setEditionTouched(getAllEditionFieldsTouched(editions));
    setClientPathErrors(pathErrors);
    setServerState(null);

    if (Object.keys(pathErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      const result = await createBookAction(payload);
      setServerState(result);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            <BookGeneralSection
              values={values}
              errors={visibleGeneralErrors}
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
              disabled={isPending}
              onSearchQueryChange={setAuthorSearchQuery}
              onAddAuthor={handleAddAuthor}
              onMoveAuthorUp={handleMoveAuthorUp}
              onMoveAuthorDown={handleMoveAuthorDown}
              onRemoveAuthor={handleRemoveAuthor}
            />

            <BookEditionsSection
              editions={editions}
              errors={visibleEditionErrors}
              sectionError={editionsError}
              disabled={isPending}
              onAddEdition={handleAddEdition}
              onRemoveEdition={handleRemoveEdition}
              onUpdateEdition={handleUpdateEdition}
              onFieldBlur={handleEditionFieldBlur}
            />

            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {serverState?.formError ? (
                <p className="mb-2 text-destructive">{serverState.formError}</p>
              ) : null}
              Completa los datos obligatorios para guardar el libro.
              {isDirty ? <span className="ml-2 font-medium">Hay cambios sin guardar.</span> : null}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <FormActions
            cancelHref="/admin/books"
            submitLabel="Guardar libro"
            pendingLabel="Guardando…"
            isPending={isPending}
            disabled={!canSubmit}
            submitTitle={
              canSubmit
                ? undefined
                : 'Selecciona al menos un autor, añade una edición y corrige los errores.'
            }
          />
        </CardFooter>
      </Card>
    </form>
  );
}
