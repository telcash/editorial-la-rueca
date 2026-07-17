import type { ChangeEvent, ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormSection } from '@/features/admin/components/forms/form-section';
import type {
  BookEditionFormErrors,
  BookEditionFormErrorsById,
  BookEditionFormField,
  BookEditionFormValues,
} from '../types/book-form-state';

const formatLabels: Record<string, string> = {
  paperback: 'Tapa blanda',
  hardcover: 'Tapa dura',
  ebook: 'Ebook',
  audiobook: 'Audiolibro',
};

interface BookEditionsSectionProps {
  editions: BookEditionFormValues[];
  errors: BookEditionFormErrorsById;
  sectionError?: string | null;
  disabled?: boolean;
  onAddEdition: () => void;
  onRemoveEdition: (clientId: string) => void;
  onUpdateEdition: (clientId: string, field: BookEditionFormField, value: string | boolean) => void;
  onFieldBlur: (clientId: string, field: BookEditionFormField) => void;
}

function getDescribedBy(id: string, error?: string) {
  return error ? `${id}-error` : undefined;
}

function EditionTextField({
  edition,
  field,
  label,
  error,
  placeholder,
  type = 'text',
  inputMode,
  disabled,
  onUpdateEdition,
  onFieldBlur,
}: {
  edition: BookEditionFormValues;
  field: Extract<
    BookEditionFormField,
    'editionLabel' | 'publicationDate' | 'isbn10' | 'isbn13' | 'price' | 'pages'
  >;
  label: string;
  error?: string;
  placeholder?: string;
  type?: string;
  inputMode?: 'decimal' | 'numeric';
  disabled?: boolean;
  onUpdateEdition: (clientId: string, field: BookEditionFormField, value: string | boolean) => void;
  onFieldBlur: (clientId: string, field: BookEditionFormField) => void;
}) {
  const id = `${edition.clientId}-${field}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={field}
        type={type}
        value={edition[field]}
        inputMode={inputMode}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy(id, error)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onUpdateEdition(edition.clientId, field, event.target.value)
        }
        onBlur={() => onFieldBlur(edition.clientId, field)}
      />
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function EditionSelectField({
  edition,
  field,
  label,
  error,
  disabled,
  children,
  onUpdateEdition,
  onFieldBlur,
}: {
  edition: BookEditionFormValues;
  field: Extract<BookEditionFormField, 'format' | 'currency'>;
  label: string;
  error?: string;
  disabled?: boolean;
  children: ReactNode;
  onUpdateEdition: (clientId: string, field: BookEditionFormField, value: string | boolean) => void;
  onFieldBlur: (clientId: string, field: BookEditionFormField) => void;
}) {
  const id = `${edition.clientId}-${field}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={field}
        value={edition[field]}
        disabled={disabled}
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy(id, error)}
        onChange={(event) => onUpdateEdition(edition.clientId, field, event.target.value)}
        onBlur={() => onFieldBlur(edition.clientId, field)}
      >
        {children}
      </select>
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function EditionSwitchField({
  edition,
  field,
  label,
  description,
  disabled,
  onUpdateEdition,
  onFieldBlur,
}: {
  edition: BookEditionFormValues;
  field: Extract<BookEditionFormField, 'isAvailable' | 'isFeatured'>;
  label: string;
  description: string;
  disabled?: boolean;
  onUpdateEdition: (clientId: string, field: BookEditionFormField, value: string | boolean) => void;
  onFieldBlur: (clientId: string, field: BookEditionFormField) => void;
}) {
  const id = `${edition.clientId}-${field}`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        name={field}
        checked={edition[field]}
        disabled={disabled}
        onCheckedChange={(value) => onUpdateEdition(edition.clientId, field, value)}
        onBlur={() => onFieldBlur(edition.clientId, field)}
      />
    </div>
  );
}

function EditionCard({
  edition,
  index,
  total,
  errors,
  disabled,
  onRemoveEdition,
  onUpdateEdition,
  onFieldBlur,
}: {
  edition: BookEditionFormValues;
  index: number;
  total: number;
  errors: BookEditionFormErrors;
  disabled?: boolean;
  onRemoveEdition: (clientId: string) => void;
  onUpdateEdition: (clientId: string, field: BookEditionFormField, value: string | boolean) => void;
  onFieldBlur: (clientId: string, field: BookEditionFormField) => void;
}) {
  return (
    <article className="space-y-5 rounded-lg border border-border px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Edición {index + 1} · {formatLabels[edition.format] ?? edition.format}
          </h3>
          <p className="text-xs text-muted-foreground">
            Posición {index + 1} de {total}. El orden visual define el sortOrder.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onRemoveEdition(edition.clientId)}
          aria-label={`Eliminar edición ${index + 1}`}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Eliminar edición
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EditionSelectField
          edition={edition}
          field="format"
          label="Formato"
          error={errors.format}
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        >
          <option value="paperback">Tapa blanda</option>
          <option value="hardcover">Tapa dura</option>
          <option value="ebook">Ebook</option>
          <option value="audiobook">Audiolibro</option>
        </EditionSelectField>
        <EditionTextField
          edition={edition}
          field="editionLabel"
          label="Nombre de la edición"
          error={errors.editionLabel}
          placeholder="Primera edición, edición revisada, edición de bolsillo..."
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionTextField
          edition={edition}
          field="publicationDate"
          label="Fecha de publicación"
          type="date"
          error={errors.publicationDate}
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionSelectField
          edition={edition}
          field="currency"
          label="Moneda"
          error={errors.currency}
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        >
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
        </EditionSelectField>
        <EditionTextField
          edition={edition}
          field="isbn10"
          label="ISBN-10"
          error={errors.isbn10}
          placeholder="0-306-40615-2"
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionTextField
          edition={edition}
          field="isbn13"
          label="ISBN-13"
          error={errors.isbn13}
          placeholder="978-84-00000-00-0"
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionTextField
          edition={edition}
          field="price"
          label="Precio"
          error={errors.price}
          placeholder="18,90"
          inputMode="decimal"
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionTextField
          edition={edition}
          field="pages"
          label="Número de páginas"
          error={errors.pages}
          inputMode="numeric"
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EditionSwitchField
          edition={edition}
          field="isAvailable"
          label="Disponible"
          description="La edición puede mostrarse como disponible en el catálogo."
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
        <EditionSwitchField
          edition={edition}
          field="isFeatured"
          label="Edición destacada"
          description="Marca esta edición como preferente dentro del libro."
          disabled={disabled}
          onUpdateEdition={onUpdateEdition}
          onFieldBlur={onFieldBlur}
        />
      </div>
    </article>
  );
}

export function BookEditionsSection({
  editions,
  errors,
  sectionError,
  disabled,
  onAddEdition,
  onRemoveEdition,
  onUpdateEdition,
  onFieldBlur,
}: BookEditionsSectionProps) {
  return (
    <FormSection
      title="Ediciones y precios"
      description="Añade los formatos comerciales, precios, ISBN y disponibilidad del libro."
    >
      <div className="space-y-4">
        {sectionError ? <FieldError message={sectionError} /> : null}
        <div className="grid gap-4">
          {editions.map((edition, index) => (
            <EditionCard
              key={edition.clientId}
              edition={edition}
              index={index}
              total={editions.length}
              errors={errors[edition.clientId] ?? {}}
              disabled={disabled}
              onRemoveEdition={onRemoveEdition}
              onUpdateEdition={onUpdateEdition}
              onFieldBlur={onFieldBlur}
            />
          ))}
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={onAddEdition}>
          <Plus className="size-4" aria-hidden="true" />
          Añadir edición
        </Button>
      </div>
    </FormSection>
  );
}
