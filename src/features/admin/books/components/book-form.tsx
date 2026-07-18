'use client';

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from 'react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { createBookAction } from '../actions/create-book';
import { updateBookAction } from '../actions/update-book';
import {
  createBookActionFormData,
  isBookCoverDirty,
  updateBookActionFormData,
  validateBookCoverClientFile,
} from '../lib/book-cover-form.helpers';
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
  buildUpdateBookPayload,
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
  validateUpdateBookPayload,
} from '../lib/book-edition-form.helpers';
import { isBookFormDirty } from '../lib/book-edit-form.helpers';
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
  type BookFormInitialValues,
} from '../types/book-form-state';
import type { BookActionState } from '../types/create-book-action-state';
import { BookAuthorsSection } from './book-authors-section';
import { BookCoverSection } from './book-cover-section';
import { BookEditionsSection } from './book-editions-section';
import { BookGeneralSection } from './book-general-section';

type CreateBookFormProps = {
  mode: 'create';
  authors: BookFormAuthorSummary[];
  initialValues?: BookFormInitialValues;
};

type EditBookFormProps = {
  mode: 'edit';
  bookId: string;
  authors: BookFormAuthorSummary[];
  initialValues: BookFormInitialValues;
};

type BookFormProps = CreateBookFormProps | EditBookFormProps;

function getDefaultInitialValues(): BookFormInitialValues {
  return {
    general: initialBookGeneralFormValues,
    selectedAuthors: [],
    editions: [createEmptyEdition()],
    coverUrl: '',
  };
}

export function BookForm(props: BookFormProps) {
  const { authors, mode } = props;
  const stableInitialValues = useMemo(
    () => props.initialValues ?? getDefaultInitialValues(),
    [props.initialValues],
  );
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<BookGeneralFormValues>(stableInitialValues.general);
  const [touched, setTouched] = useState<BookGeneralFormTouched>({});
  const [selectedAuthors, setSelectedAuthors] = useState<BookFormAuthorSummary[]>(
    stableInitialValues.selectedAuthors,
  );
  const [authorSearchQuery, setAuthorSearchQuery] = useState('');
  const [editions, setEditions] = useState<BookEditionFormValues[]>(stableInitialValues.editions);
  const [editionTouched, setEditionTouched] = useState<BookEditionFormTouchedById>({});
  const [clientPathErrors, setClientPathErrors] = useState<Record<string, string>>({});
  const [serverState, setServerState] = useState<BookActionState | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(mode === 'edit');
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const availableAuthors = filterAvailableAuthors(authors, selectedAuthors, authorSearchQuery);
  const buildPayload = mode === 'edit' ? buildUpdateBookPayload : buildCreateBookPayload;
  const validatePayload = mode === 'edit' ? validateUpdateBookPayload : validateCreateBookPayload;
  const currentPayload = buildPayload(values, selectedAuthors, editions);
  const submitGeneralErrors = getGeneralErrorsFromPathErrors(clientPathErrors);
  const visibleGeneralErrors = {
    ...getVisibleBookGeneralErrors(values, touched),
    ...submitGeneralErrors,
    ...(serverState ? getGeneralErrorsFromPathErrors(serverState.pathErrors) : {}),
  };
  const clientEditionErrors = getEditionErrorsFromPathErrors(clientPathErrors, editions);
  const visibleEditionErrors = {
    ...getVisibleEditionErrors(
      getEditionErrorsFromPathErrors(validatePayload(currentPayload), editions),
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
  const currentPathErrors = validatePayload(currentPayload);
  const hasClientErrors = Object.keys(currentPathErrors).length > 0;
  const currentInitialValues = {
    general: values,
    selectedAuthors,
    editions,
    coverUrl: stableInitialValues.coverUrl,
  };
  const isDirty =
    mode === 'edit'
      ? isBookFormDirty(stableInitialValues, currentInitialValues) ||
        isBookCoverDirty({ selectedFile: selectedCoverFile, removeExistingCover })
      : areBookGeneralValuesDirty(values, stableInitialValues.general) ||
        selectedAuthors.length > 0 ||
        isBookFormDirty(getDefaultInitialValues(), currentInitialValues) ||
        isBookCoverDirty({ selectedFile: selectedCoverFile, removeExistingCover });
  const canSubmit =
    selectedAuthors.length > 0 &&
    editions.length > 0 &&
    !hasClientErrors &&
    !coverError &&
    (mode === 'create' || isDirty);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

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

  function handleCoverFileChange(file: File | null) {
    setServerState(null);

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }

    if (!file) {
      setSelectedCoverFile(null);
      setCoverError(null);
      return;
    }

    const validationError = validateBookCoverClientFile(file);

    if (validationError) {
      setSelectedCoverFile(null);
      setCoverError(validationError);
      return;
    }

    setSelectedCoverFile(file);
    setRemoveExistingCover(false);
    setCoverError(null);
    setCoverPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveExistingCover() {
    setServerState(null);

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
      setCoverPreviewUrl(null);
    }

    setSelectedCoverFile(null);
    setCoverError(null);
    setRemoveExistingCover(true);
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

    const payload = buildPayload(values, selectedAuthors, editions);
    const pathErrors = validatePayload(payload);

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

    if (Object.keys(pathErrors).length > 0 || coverError) {
      return;
    }

    startTransition(async () => {
      const result =
        mode === 'edit'
          ? await updateBookAction(
              props.bookId,
              updateBookActionFormData(payload, selectedCoverFile, removeExistingCover),
            )
          : await createBookAction(createBookActionFormData(payload, selectedCoverFile));
      setServerState(result);
    });
  }

  function handleCancelClick(event: MouseEvent<HTMLAnchorElement>) {
    if (mode !== 'edit' || !isDirty) {
      return;
    }

    if (!window.confirm('Hay cambios sin guardar. ¿Quieres salir sin guardarlos?')) {
      event.preventDefault();
    }
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
              autoFocusTitle={mode === 'create'}
              onTextChange={handleTextChange}
              onBooleanChange={handleBooleanChange}
              onFieldBlur={handleFieldBlur}
              onSlugReset={handleSlugReset}
            />

            <BookCoverSection
              currentCoverUrl={stableInitialValues.coverUrl}
              previewUrl={coverPreviewUrl}
              selectedFile={selectedCoverFile}
              removeExistingCover={removeExistingCover}
              error={coverError ?? serverState?.pathErrors.cover ?? null}
              disabled={isPending}
              onFileChange={handleCoverFileChange}
              onRemoveExistingCover={handleRemoveExistingCover}
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
            submitLabel={mode === 'edit' ? 'Guardar cambios' : 'Guardar libro'}
            pendingLabel="Guardando…"
            isPending={isPending}
            disabled={!canSubmit}
            onCancelClick={handleCancelClick}
            submitTitle={
              canSubmit
                ? undefined
                : mode === 'edit' && !isDirty
                  ? 'No hay cambios para guardar.'
                  : 'Selecciona al menos un autor, añade una edición y corrige los errores.'
            }
          />
        </CardFooter>
      </Card>
    </form>
  );
}
