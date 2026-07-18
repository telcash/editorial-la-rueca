import { ImageIcon, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/features/admin/components/forms/field-error';
import { FormSection } from '@/features/admin/components/forms/form-section';
import { BOOK_COVER_MAX_SIZE_BYTES } from '../services/book-cover-constants';
import { formatBookCoverFileSize } from '../lib/book-cover-form.helpers';

interface BookCoverSectionProps {
  currentCoverUrl: string;
  previewUrl: string | null;
  selectedFile: File | null;
  removeExistingCover: boolean;
  error: string | null;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
  onRemoveExistingCover: () => void;
}

export function BookCoverSection({
  currentCoverUrl,
  previewUrl,
  selectedFile,
  removeExistingCover,
  error,
  disabled,
  onFileChange,
  onRemoveExistingCover,
}: BookCoverSectionProps) {
  const visibleCoverUrl = previewUrl ?? (removeExistingCover ? '' : currentCoverUrl);
  const maxSizeMb = BOOK_COVER_MAX_SIZE_BYTES / (1024 * 1024);
  const inputLabel = currentCoverUrl ? 'Cambiar portada' : 'Seleccionar imagen';

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <FormSection
      title="Portada del libro"
      description="Selecciona la imagen que se mostrará en el catálogo y la ficha del libro."
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,12rem)_1fr]">
        <div className="space-y-2">
          <div className="aspect-[2/3] w-40 max-w-full overflow-hidden rounded-md border border-border bg-muted">
            {visibleCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visibleCoverUrl}
                alt="Portada del libro"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-6" aria-hidden="true" />
              </div>
            )}
          </div>
          {currentCoverUrl && !previewUrl && !removeExistingCover ? (
            <p className="text-sm text-muted-foreground">Portada actual</p>
          ) : null}
          {previewUrl ? <p className="text-sm text-muted-foreground">Previsualización</p> : null}
          {removeExistingCover ? (
            <p className="text-sm text-muted-foreground">La portada se eliminará al guardar.</p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cover">{inputLabel}</Label>
            <Input
              id="cover"
              name="cover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'cover-error' : 'cover-help'}
              onChange={handleFileChange}
            />
            <p id="cover-help" className="text-sm text-muted-foreground">
              Formatos: JPG, PNG o WebP. Máximo {maxSizeMb} MB.
            </p>
            <div id="cover-error">
              <FieldError message={error ?? undefined} />
            </div>
          </div>

          {selectedFile ? (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedFile.name}</span>
              <span className="ml-2">{formatBookCoverFileSize(selectedFile.size)}</span>
            </div>
          ) : null}

          {currentCoverUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={onRemoveExistingCover}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar portada
            </Button>
          ) : null}
        </div>
      </div>
    </FormSection>
  );
}
