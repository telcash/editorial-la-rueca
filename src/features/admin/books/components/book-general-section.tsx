import type { ChangeEvent, FocusEvent } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormSection } from '@/features/admin/components/forms/form-section';
import type {
  BookGeneralFormErrors,
  BookGeneralFormField,
  BookGeneralFormTouched,
  BookGeneralFormValues,
} from '../types/book-form-state';

interface BookGeneralSectionProps {
  values: BookGeneralFormValues;
  errors: BookGeneralFormErrors;
  touched: BookGeneralFormTouched;
  isSlugManuallyEdited: boolean;
  autoFocusTitle?: boolean;
  onTextChange: (field: BookGeneralFormField, value: string) => void;
  onBooleanChange: (
    field: Extract<BookGeneralFormField, 'isPublished' | 'isFeatured'>,
    value: boolean,
  ) => void;
  onFieldBlur: (field: BookGeneralFormField) => void;
  onSlugReset: () => void;
}

interface FieldMeta {
  id: BookGeneralFormField;
  help?: string;
}

function getDescribedBy({ id, help }: FieldMeta, error?: string) {
  return (
    [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined
  );
}

function TextField({
  id,
  label,
  value,
  error,
  help,
  placeholder,
  type = 'text',
  maxLength,
  autoFocus = false,
  onChange,
  onBlur,
}: {
  id: Extract<
    BookGeneralFormField,
    | 'title'
    | 'subtitle'
    | 'slug'
    | 'originalPublicationDate'
    | 'sortOrder'
    | 'metaTitle'
    | 'canonicalUrl'
  >;
  label: string;
  value: string;
  error?: string;
  help?: string;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoFocus?: boolean;
  onChange: (field: BookGeneralFormField, value: string) => void;
  onBlur: (field: BookGeneralFormField) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        step={type === 'number' ? '1' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy({ id, help }, error)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(id, event.target.value)}
        onBlur={() => onBlur(id)}
      />
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function TextareaField({
  id,
  label,
  value,
  error,
  help,
  placeholder,
  rows,
  maxLength,
  onChange,
  onBlur,
}: {
  id: Extract<BookGeneralFormField, 'description' | 'excerpt' | 'metaDescription'>;
  label: string;
  value: string;
  error?: string;
  help?: string;
  placeholder?: string;
  rows: number;
  maxLength?: number;
  onChange: (field: BookGeneralFormField, value: string) => void;
  onBlur: (field: BookGeneralFormField) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy({ id, help }, error)}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(id, event.target.value)}
        onBlur={() => onBlur(id)}
      />
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  );
}

function SwitchField({
  id,
  label,
  description,
  checked,
  onChange,
  onBlur,
}: {
  id: Extract<BookGeneralFormField, 'isPublished' | 'isFeatured'>;
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    field: Extract<BookGeneralFormField, 'isPublished' | 'isFeatured'>,
    value: boolean,
  ) => void;
  onBlur: (field: BookGeneralFormField) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        name={id}
        checked={checked}
        onCheckedChange={(value) => onChange(id, value)}
        onBlur={() => onBlur(id)}
      />
    </div>
  );
}

function LanguageField({
  value,
  error,
  onChange,
  onBlur,
}: {
  value: string;
  error?: string;
  onChange: (field: BookGeneralFormField, value: string) => void;
  onBlur: (field: BookGeneralFormField) => void;
}) {
  const id = 'language';

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Idioma</Label>
      <select
        id={id}
        name={id}
        value={value}
        className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-invalid={error ? true : undefined}
        aria-describedby={getDescribedBy({ id }, error)}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(id, event.target.value)}
        onBlur={(event: FocusEvent<HTMLSelectElement>) => {
          event.currentTarget.checkValidity();
          onBlur(id);
        }}
      >
        <option value="">Selecciona un idioma</option>
        <option value="es">Español</option>
        <option value="en">English</option>
        <option value="fr">Français</option>
      </select>
      <div id={`${id}-error`}>
        <FieldError message={error} />
      </div>
    </div>
  );
}

export function BookGeneralSection({
  values,
  errors,
  touched,
  isSlugManuallyEdited,
  autoFocusTitle = false,
  onTextChange,
  onBooleanChange,
  onFieldBlur,
  onSlugReset,
}: BookGeneralSectionProps) {
  const hasTouchedFields = Object.values(touched).some(Boolean);

  return (
    <FormSection
      title="Información general"
      description="Datos comunes de la obra, independientes de sus formatos y ediciones."
    >
      <div className="grid gap-5">
        <TextField
          id="title"
          label="Título"
          value={values.title}
          error={errors.title}
          placeholder="El título del libro"
          maxLength={220}
          autoFocus={autoFocusTitle}
          onChange={onTextChange}
          onBlur={onFieldBlur}
        />

        <TextField
          id="subtitle"
          label="Subtítulo"
          value={values.subtitle}
          error={errors.subtitle}
          placeholder="Subtítulo opcional"
          maxLength={220}
          onChange={onTextChange}
          onBlur={onFieldBlur}
        />

        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <Label htmlFor="slug">Slug</Label>
            <button
              type="button"
              className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
              onClick={onSlugReset}
            >
              Restablecer desde el título
            </button>
          </div>
          <div className="flex rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
            <span className="flex items-center border-r border-border px-3 text-sm text-muted-foreground">
              /libros/
            </span>
            <input
              id="slug"
              name="slug"
              value={values.slug}
              placeholder="el-titulo-del-libro"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={getDescribedBy(
                {
                  id: 'slug',
                  help: 'Se usará en la URL pública del libro.',
                },
                errors.slug,
              )}
              onChange={(event) => onTextChange('slug', event.target.value)}
              onBlur={() => onFieldBlur('slug')}
            />
          </div>
          <p id="slug-help" className="text-sm text-muted-foreground">
            Se usará en la URL pública del libro. Modo:{' '}
            {isSlugManuallyEdited ? 'manual' : 'automático'}.
          </p>
          <div id="slug-error">
            <FieldError message={errors.slug} />
          </div>
        </div>

        <TextareaField
          id="description"
          label="Descripción"
          value={values.description}
          error={errors.description}
          placeholder="Descripción completa del libro"
          rows={6}
          onChange={onTextChange}
          onBlur={onFieldBlur}
        />

        <TextareaField
          id="excerpt"
          label="Extracto breve"
          value={values.excerpt}
          error={errors.excerpt}
          help="Resumen breve para tarjetas, listados y resultados de búsqueda."
          rows={3}
          onChange={onTextChange}
          onBlur={onFieldBlur}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <TextField
            id="originalPublicationDate"
            label="Fecha original de publicación"
            value={values.originalPublicationDate}
            error={errors.originalPublicationDate}
            help="Fecha de publicación original de la obra. Cada edición podrá tener su propia fecha."
            type="date"
            onChange={onTextChange}
            onBlur={onFieldBlur}
          />
          <LanguageField
            value={values.language}
            error={errors.language}
            onChange={onTextChange}
            onBlur={onFieldBlur}
          />
          <TextField
            id="sortOrder"
            label="Orden"
            value={values.sortOrder}
            error={errors.sortOrder}
            type="number"
            onChange={onTextChange}
            onBlur={onFieldBlur}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SwitchField
            id="isPublished"
            label="Publicado"
            description="El libro podrá aparecer en el catálogo público."
            checked={values.isPublished}
            onChange={onBooleanChange}
            onBlur={onFieldBlur}
          />
          <SwitchField
            id="isFeatured"
            label="Destacado"
            description="El libro podrá aparecer en secciones destacadas del sitio."
            checked={values.isFeatured}
            onChange={onBooleanChange}
            onBlur={onFieldBlur}
          />
        </div>

        <div className="space-y-4 border-t border-border pt-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">SEO</h3>
            <p className="text-sm text-muted-foreground">
              Metadatos que se usarán más adelante en la página pública del libro.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="metaTitle"
              label="Título SEO"
              value={values.metaTitle}
              error={errors.metaTitle}
              maxLength={160}
              onChange={onTextChange}
              onBlur={onFieldBlur}
            />
            <TextField
              id="canonicalUrl"
              label="URL canónica"
              value={values.canonicalUrl}
              error={errors.canonicalUrl}
              type="url"
              onChange={onTextChange}
              onBlur={onFieldBlur}
            />
          </div>
          <TextareaField
            id="metaDescription"
            label="Descripción SEO"
            value={values.metaDescription}
            error={errors.metaDescription}
            rows={3}
            maxLength={300}
            onChange={onTextChange}
            onBlur={onFieldBlur}
          />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {hasTouchedFields ? 'Validación del formulario activa.' : ''}
      </p>
    </FormSection>
  );
}
