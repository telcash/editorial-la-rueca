import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { FormSection } from '@/features/admin/components/forms/form-section';
import type { BookFormCategorySummary } from '../types/book-form-state';

interface BookCategoriesSectionProps {
  categories: BookFormCategorySummary[];
  selectedCategories: BookFormCategorySummary[];
  searchQuery: string;
  disabled?: boolean;
  onSearchQueryChange: (value: string) => void;
  onAddCategory: (category: BookFormCategorySummary) => void;
  onMoveCategoryUp: (categoryId: string) => void;
  onMoveCategoryDown: (categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
}

function CategorySearchResults({
  categories,
  disabled,
  onAddCategory,
}: {
  categories: BookFormCategorySummary[];
  disabled?: boolean;
  onAddCategory: (category: BookFormCategorySummary) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        No hay categorías disponibles para la búsqueda actual.
      </p>
    );
  }

  return (
    <ul className="grid gap-2" aria-label="Resultados de búsqueda de categorías">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center gap-3 rounded-lg border border-border px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xs text-muted-foreground">{category.slug}</p>
              <ArchivedBadge isArchived={category.isArchived} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || category.isArchived}
            onClick={() => onAddCategory(category)}
            aria-label={`Añadir ${category.name}`}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Añadir
          </Button>
        </li>
      ))}
    </ul>
  );
}

function SelectedCategoryCard({
  category,
  index,
  totalCategories,
  disabled,
  onMoveCategoryUp,
  onMoveCategoryDown,
  onRemoveCategory,
}: {
  category: BookFormCategorySummary;
  index: number;
  totalCategories: number;
  disabled?: boolean;
  onMoveCategoryUp: (categoryId: string) => void;
  onMoveCategoryDown: (categoryId: string) => void;
  onRemoveCategory: (categoryId: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {index + 1}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-xs text-muted-foreground">{category.slug}</p>
            <ArchivedBadge isArchived={category.isArchived} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 sm:ml-auto">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || index === 0}
          aria-label={`Subir ${category.name}`}
          onClick={() => onMoveCategoryUp(category.id)}
        >
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled || index === totalCategories - 1}
          aria-label={`Bajar ${category.name}`}
          onClick={() => onMoveCategoryDown(category.id)}
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          aria-label={`Eliminar ${category.name}`}
          onClick={() => onRemoveCategory(category.id)}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export function BookCategoriesSection({
  categories,
  selectedCategories,
  searchQuery,
  disabled,
  onSearchQueryChange,
  onAddCategory,
  onMoveCategoryUp,
  onMoveCategoryDown,
  onRemoveCategory,
}: BookCategoriesSectionProps) {
  return (
    <FormSection
      title="Categorías"
      description="Selecciona categorías editoriales y define su orden visual."
    >
      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="category-search">Buscar categoría</Label>
          <Input
            id="category-search"
            type="search"
            value={searchQuery}
            placeholder="Buscar categoría..."
            autoComplete="off"
            disabled={disabled}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Resultados</h3>
            <CategorySearchResults
              categories={categories}
              disabled={disabled}
              onAddCategory={onAddCategory}
            />
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">Categorías seleccionadas</h3>
              <p className="text-xs text-muted-foreground">
                El orden visual se conservará para el libro.
              </p>
            </div>
            {selectedCategories.length > 0 ? (
              <ol className="grid gap-2" aria-label="Categorías seleccionadas">
                {selectedCategories.map((category, index) => (
                  <SelectedCategoryCard
                    key={category.id}
                    category={category}
                    index={index}
                    totalCategories={selectedCategories.length}
                    disabled={disabled}
                    onMoveCategoryUp={onMoveCategoryUp}
                    onMoveCategoryDown={onMoveCategoryDown}
                    onRemoveCategory={onRemoveCategory}
                  />
                ))}
              </ol>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                Todavía no has seleccionado categorías.
              </p>
            )}
          </div>
        </div>
      </div>
    </FormSection>
  );
}
