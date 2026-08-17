'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormActions } from '@/features/admin/components/forms/form-actions';
import { FormSection } from '@/features/admin/components/forms/form-section';
import { createAuthorTestimonialAction } from '../actions/create-author-testimonial';
import { updateAuthorTestimonialAction } from '../actions/update-author-testimonial';
import {
  initialAuthorTestimonialFormState,
  type AuthorTestimonialFormState,
  type AuthorTestimonialFormValues,
} from '../types/author-testimonial-form-state';

interface AuthorTestimonialFormOption {
  id: string;
  label: string;
}

interface AuthorTestimonialFormProps {
  mode?: 'create' | 'edit';
  testimonialId?: string;
  initialValues?: AuthorTestimonialFormValues;
  authors: AuthorTestimonialFormOption[];
  books: AuthorTestimonialFormOption[];
}

function AuthorTestimonialFormActions({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <FormActions
      cancelHref="/admin/testimonials"
      submitLabel={submitLabel}
      pendingLabel="Guardando…"
      isPending={pending}
    />
  );
}

function getInitialState(initialValues?: AuthorTestimonialFormValues): AuthorTestimonialFormState {
  if (!initialValues) {
    return initialAuthorTestimonialFormState;
  }

  return {
    ...initialAuthorTestimonialFormState,
    values: initialValues,
  };
}

export function AuthorTestimonialForm({
  mode = 'create',
  testimonialId,
  initialValues,
  authors,
  books,
}: AuthorTestimonialFormProps) {
  const action =
    mode === 'edit' && testimonialId
      ? updateAuthorTestimonialAction.bind(null, testimonialId)
      : createAuthorTestimonialAction;
  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Crear testimonio';
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
              title="Contenido del testimonio"
              description="Registra el texto editorial y su relación con un autor. El libro es opcional."
            >
              <div className="grid gap-5">
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="authorId">Autor</Label>
                    <select
                      id="authorId"
                      name="authorId"
                      defaultValue={state.values.authorId}
                      className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
                      required
                    >
                      <option value="">Selecciona un autor</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.label}
                        </option>
                      ))}
                    </select>
                    <FieldError message={state.fieldErrors.authorId?.[0]} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bookId">Libro relacionado</Label>
                    <select
                      id="bookId"
                      name="bookId"
                      defaultValue={state.values.bookId}
                      className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Sin libro específico</option>
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.label}
                        </option>
                      ))}
                    </select>
                    <FieldError message={state.fieldErrors.bookId?.[0]} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quote">Testimonio</Label>
                  <Textarea
                    id="quote"
                    name="quote"
                    defaultValue={state.values.quote}
                    rows={8}
                    required
                  />
                  <FieldError message={state.fieldErrors.quote?.[0]} />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="source">Fuente</Label>
                    <Input
                      id="source"
                      name="source"
                      defaultValue={state.values.source}
                      placeholder="manual"
                    />
                    <FieldError message={state.fieldErrors.source?.[0]} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rating">Valoración</Label>
                    <Input
                      id="rating"
                      name="rating"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={state.values.rating}
                      placeholder="Opcional"
                    />
                    <FieldError message={state.fieldErrors.rating?.[0]} />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sortOrder">Orden</Label>
                    <Input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      defaultValue={state.values.sortOrder}
                    />
                    <FieldError message={state.fieldErrors.sortOrder?.[0]} />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
                    <div>
                      <Label htmlFor="isPublished">Publicado</Label>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Solo los testimonios publicados podrán aparecer en la web pública.
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
                        Los destacados alimentarán la futura sección de testimonios principales.
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
          <AuthorTestimonialFormActions submitLabel={submitLabel} />
        </CardFooter>
      </Card>
    </form>
  );
}
