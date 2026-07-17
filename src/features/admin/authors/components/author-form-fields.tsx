import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EntityThumbnail } from '@/features/admin/components/data-display/entity-thumbnail';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { AUTHOR_IMAGE_MAX_SIZE_BYTES } from '../services/author-image-constants';
import type { AuthorFormFieldErrors, AuthorFormValues } from '../types/author-form-state';

interface AuthorFormFieldsProps {
  values: AuthorFormValues;
  fieldErrors: AuthorFormFieldErrors;
  mode: 'create' | 'edit';
}

function TextField({
  id,
  label,
  defaultValue,
  errors,
  type = 'text',
  placeholder,
}: {
  id: keyof Pick<
    AuthorFormValues,
    'name' | 'slug' | 'websiteUrl' | 'instagramUrl' | 'facebookUrl' | 'country' | 'sortOrder'
  >;
  label: string;
  defaultValue: string;
  errors?: string[];
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
      />
      <div id={`${id}-error`}>
        <FieldError message={errors?.[0]} />
      </div>
    </div>
  );
}

function PhotoField({
  mode,
  currentPhotoUrl,
  errors,
}: {
  mode: 'create' | 'edit';
  currentPhotoUrl: string;
  errors?: string[];
}) {
  const label = mode === 'edit' ? 'Reemplazar foto' : 'Foto del autor';
  const maxSizeMb = AUTHOR_IMAGE_MAX_SIZE_BYTES / (1024 * 1024);

  return (
    <div className="space-y-3 rounded-lg border border-border px-4 py-4">
      {mode === 'edit' && currentPhotoUrl ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Foto actual</p>
          <EntityThumbnail src={currentPhotoUrl} alt="Foto actual del autor" variant="square" />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="photo">{label}</Label>
        <Input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errors?.length ? 'photo-error' : 'photo-help'}
        />
        <p id="photo-help" className="text-sm text-muted-foreground">
          Selecciona una imagen JPG, PNG o WebP. Tamaño máximo: {maxSizeMb} MB.
        </p>
        <div id="photo-error">
          <FieldError message={errors?.[0]} />
        </div>
      </div>
    </div>
  );
}

function TextareaField({
  id,
  label,
  defaultValue,
  errors,
  rows,
}: {
  id: keyof Pick<AuthorFormValues, 'shortBio' | 'biography'>;
  label: string;
  defaultValue: string;
  errors?: string[];
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={id}
        defaultValue={defaultValue}
        rows={rows}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length ? `${id}-error` : undefined}
      />
      <div id={`${id}-error`}>
        <FieldError message={errors?.[0]} />
      </div>
    </div>
  );
}

function SwitchField({
  id,
  label,
  description,
  defaultChecked,
}: {
  id: keyof Pick<AuthorFormValues, 'isPublished' | 'isFeatured'>;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <input type="hidden" name={id} value="false" />
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} name={id} value="true" defaultChecked={defaultChecked} />
    </div>
  );
}

export function AuthorFormFields({ values, fieldErrors, mode }: AuthorFormFieldsProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id="name" label="Nombre" defaultValue={values.name} errors={fieldErrors.name} />
        <TextField
          id="slug"
          label="Slug"
          defaultValue={values.slug}
          errors={fieldErrors.slug}
          placeholder="nombre-del-autor"
        />
      </div>

      <TextareaField
        id="shortBio"
        label="Biografía breve"
        defaultValue={values.shortBio}
        errors={fieldErrors.shortBio}
        rows={3}
      />
      <TextareaField
        id="biography"
        label="Biografía"
        defaultValue={values.biography}
        errors={fieldErrors.biography}
        rows={6}
      />

      <PhotoField mode={mode} currentPhotoUrl={values.photoUrl} errors={fieldErrors.photo} />

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id="websiteUrl"
          label="Sitio web"
          defaultValue={values.websiteUrl}
          errors={fieldErrors.websiteUrl}
          type="url"
        />
        <TextField
          id="instagramUrl"
          label="Instagram"
          defaultValue={values.instagramUrl}
          errors={fieldErrors.instagramUrl}
          type="url"
        />
        <TextField
          id="facebookUrl"
          label="Facebook"
          defaultValue={values.facebookUrl}
          errors={fieldErrors.facebookUrl}
          type="url"
        />
        <TextField
          id="country"
          label="País"
          defaultValue={values.country}
          errors={fieldErrors.country}
        />
        <TextField
          id="sortOrder"
          label="Orden"
          defaultValue={values.sortOrder}
          errors={fieldErrors.sortOrder}
          type="number"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SwitchField
          id="isPublished"
          label="Publicado"
          description="Mostrar este autor cuando existan vistas públicas."
          defaultChecked={values.isPublished}
        />
        <SwitchField
          id="isFeatured"
          label="Destacado"
          description="Marcar como autor destacado para usos editoriales futuros."
          defaultChecked={values.isFeatured}
        />
      </div>
    </div>
  );
}
