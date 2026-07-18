import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormSection } from '@/features/admin/components/forms/form-section';
import type { BookFormAuthorSummary } from '../types/book-form-state';

interface BookAuthorsSectionProps {
  authors: BookFormAuthorSummary[];
  selectedAuthors: BookFormAuthorSummary[];
  searchQuery: string;
  error?: string;
  disabled?: boolean;
  onSearchQueryChange: (value: string) => void;
  onAddAuthor: (author: BookFormAuthorSummary) => void;
  onMoveAuthorUp: (authorId: string) => void;
  onMoveAuthorDown: (authorId: string) => void;
  onRemoveAuthor: (authorId: string) => void;
}

function AuthorSearchResults({
  authors,
  disabled,
  onAddAuthor,
}: {
  authors: BookFormAuthorSummary[];
  disabled?: boolean;
  onAddAuthor: (author: BookFormAuthorSummary) => void;
}) {
  if (authors.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        No hay autores disponibles para la búsqueda actual.
      </p>
    );
  }

  return (
    <ul className="grid gap-2" aria-label="Resultados de búsqueda de autores">
      {authors.map((author) => (
        <li
          key={author.id}
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-3"
        >
          <EntityThumbnail src={author.photoUrl} alt={`Foto de ${author.name}`} variant="avatar" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{author.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xs text-muted-foreground">{author.slug}</p>
              <ArchivedBadge isArchived={author.isArchived} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onAddAuthor(author)}
            aria-label={`Añadir ${author.name}`}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Añadir
          </Button>
        </li>
      ))}
    </ul>
  );
}

function SelectedAuthorCard({
  author,
  index,
  totalAuthors,
  disabled,
  onMoveAuthorUp,
  onMoveAuthorDown,
  onRemoveAuthor,
}: {
  author: BookFormAuthorSummary;
  index: number;
  totalAuthors: number;
  disabled?: boolean;
  onMoveAuthorUp: (authorId: string) => void;
  onMoveAuthorDown: (authorId: string) => void;
  onRemoveAuthor: (authorId: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {index + 1}
        </div>
        <EntityThumbnail src={author.photoUrl} alt={`Foto de ${author.name}`} variant="avatar" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{author.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">{author.slug}</p>
            <ArchivedBadge isArchived={author.isArchived} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || index === 0}
          aria-label={`Subir ${author.name}`}
          onClick={() => onMoveAuthorUp(author.id)}
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || index === totalAuthors - 1}
          aria-label={`Bajar ${author.name}`}
          onClick={() => onMoveAuthorDown(author.id)}
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label={`Eliminar ${author.name}`}
          onClick={() => onRemoveAuthor(author.id)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function BookAuthorsSection({
  authors,
  selectedAuthors,
  searchQuery,
  error,
  disabled,
  onSearchQueryChange,
  onAddAuthor,
  onMoveAuthorUp,
  onMoveAuthorDown,
  onRemoveAuthor,
}: BookAuthorsSectionProps) {
  return (
    <FormSection
      title="Autores"
      description="Selecciona uno o varios autores y define el orden en el que aparecerán."
    >
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="author-search">Buscar autor</Label>
          <Input
            id="author-search"
            type="search"
            value={searchQuery}
            placeholder="Buscar autor..."
            autoComplete="off"
            disabled={disabled}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Resultados</h3>
            <AuthorSearchResults authors={authors} disabled={disabled} onAddAuthor={onAddAuthor} />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Autores seleccionados</h3>
              <p className="text-xs text-muted-foreground">
                El orden visual se conservará para crear el libro.
              </p>
            </div>
            {selectedAuthors.length > 0 ? (
              <ol className="grid gap-2" aria-label="Autores seleccionados">
                {selectedAuthors.map((author, index) => (
                  <SelectedAuthorCard
                    key={author.id}
                    author={author}
                    index={index}
                    totalAuthors={selectedAuthors.length}
                    disabled={disabled}
                    onMoveAuthorUp={onMoveAuthorUp}
                    onMoveAuthorDown={onMoveAuthorDown}
                    onRemoveAuthor={onRemoveAuthor}
                  />
                ))}
              </ol>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                Todavía no has seleccionado autores.
              </p>
            )}
            <FieldError message={error} />
          </div>
        </div>
      </div>
    </FormSection>
  );
}
