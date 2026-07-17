'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { createAuthor } from '../actions/create-author';
import { initialAuthorFormState } from '../types/author-form-state';
import { AuthorFormFields } from './author-form-fields';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Guardando…' : 'Guardar autor'}
    </Button>
  );
}

export function AuthorForm() {
  const [state, formAction] = useActionState(createAuthor, initialAuthorFormState);

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
            <AuthorFormFields values={state.values} fieldErrors={state.fieldErrors} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-3 border-t border-border sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/admin/authors">Cancelar</Link>
          </Button>
          <SubmitButton />
        </CardFooter>
      </Card>
    </form>
  );
}
