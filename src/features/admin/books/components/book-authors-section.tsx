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
    <ul
      className="grid max-h-[30rem] min-w-0 gap-2 overflow-y-auto overflow-x-hidden pr-1"
      aria-label="Resultados de búsqueda de autores"
      data-layout="author-search-results"
    >
      {authors.map((author) => (
        <li
          key={author.id}
          className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border px-3 py-3"
        >
          <EntityThumbnail src={author.photoUrl} alt={`Foto de ${author.name}`} variant="avatar" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium text-foreground">{author.name}</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-xs text-muted-foreground">{author.slug}</p>
              <ArchivedBadge isArchived={author.isArchived} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
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
    <li
      className="grid w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto] items-center gap-2 rounded-lg border border-border px-3 py-3"
      data-layout="selected-author-row"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {index + 1}
      </div>
      <EntityThumbnail src={author.photoUrl} alt={`Foto de ${author.name}`} variant="avatar" />
      <div className="min-w-0">
        <p className="line-clamp-2 break-words text-sm font-medium text-foreground">
          {author.name}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">{author.slug}</p>
          <ArchivedBadge isArchived={author.isArchived} />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0"
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
        className="shrink-0"
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
        className="shrink-0"
        disabled={disabled}
        aria-label={`Eliminar ${author.name}`}
        onClick={() => onRemoveAuthor(author.id)}
      >
        <X className="size-3.5" aria-hidden="true" />
      </Button>
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
      <div className="grid min-w-0 gap-6">
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

        <div
          className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          data-layout="book-authors-responsive-grid"
        >
          <div className="min-w-0 space-y-3 overflow-x-hidden">
            <h3 className="text-sm font-medium text-foreground">Resultados</h3>
            <AuthorSearchResults authors={authors} disabled={disabled} onAddAuthor={onAddAuthor} />
          </div>

          <div className="min-w-0 space-y-3 overflow-x-hidden">
            <div>
              <h3 className="text-sm font-medium text-foreground">Autores seleccionados</h3>
              <p className="text-xs text-muted-foreground">
                El orden visual se conservará para crear el libro.
              </p>
            </div>
            {selectedAuthors.length > 0 ? (
              <ol
                className="grid min-w-0 gap-2 overflow-x-hidden"
                aria-label="Autores seleccionados"
                data-layout="selected-authors-list"
              >
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
