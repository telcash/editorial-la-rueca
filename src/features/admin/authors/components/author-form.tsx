'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { createAuthor } from '../actions/create-author';
import { updateAuthor } from '../actions/update-author';
import {
  initialAuthorFormState,
  type AuthorFormState,
  type AuthorFormValues,
} from '../types/author-form-state';
import { AuthorFormFields } from './author-form-fields';

interface AuthorFormProps {
  mode?: 'create' | 'edit';
  authorId?: string;
  initialValues?: AuthorFormValues;
}

function AuthorFormActions({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <FormActions
      cancelHref="/admin/authors"
      submitLabel={submitLabel}
      pendingLabel="Guardando…"
      isPending={pending}
    />
  );
}

function getInitialState(initialValues?: AuthorFormValues): AuthorFormState {
  if (!initialValues) {
    return initialAuthorFormState;
  }

  return {
    ...initialAuthorFormState,
    values: initialValues,
  };
}

export function AuthorForm({ mode = 'create', authorId, initialValues }: AuthorFormProps) {
  const action = mode === 'edit' && authorId ? updateAuthor.bind(null, authorId) : createAuthor;
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Crear autor';
  const [state, formAction] = useActionState(action, getInitialState(initialValues));

  return (
    <form action={formAction} encType="multipart/form-data">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {state.formError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {state.formError}
              </div>
            ) : null}
            <AuthorFormFields values={state.values} fieldErrors={state.fieldErrors} mode={mode} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <AuthorFormActions submitLabel={submitLabel} />
        </CardFooter>
      </Card>
    </form>
  );
}
