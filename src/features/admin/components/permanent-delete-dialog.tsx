'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPermanentDeleteConfirmationValid } from '@/features/admin/lib/permanent-delete-confirmation';

interface PermanentDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  entityLabel: string;
  dependencyMessage?: string | null;
  pending: boolean;
  errorMessage?: string | null;
  onConfirm: (confirmation: string) => void;
  onCancel: () => void;
}

export function PermanentDeleteDialog({
  open,
  title,
  description,
  entityLabel,
  dependencyMessage,
  pending,
  errorMessage,
  onConfirm,
  onCancel,
}: PermanentDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canConfirm =
    isPermanentDeleteConfirmationValid(confirmation) && !pending && !dependencyMessage;

  useEffect(() => {
    const focusTimeout = window.setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, pending]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${inputId}-title`}
        aria-describedby={`${inputId}-description`}
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id={`${inputId}-title`} className="text-base font-semibold text-foreground">
              {title}
            </h2>
            <p id={`${inputId}-description`} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{entityLabel}</p>
          </div>
        </div>

        {dependencyMessage ? (
          <p role="alert" className="mt-4 rounded-md border border-border bg-muted p-3 text-sm">
            {dependencyMessage}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <Label htmlFor={inputId}>Escribe ELIMINAR para continuar</Label>
            <Input
              ref={inputRef}
              id={inputId}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              autoComplete="off"
            />
          </div>
        )}

        {errorMessage ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(confirmation)}
            disabled={!canConfirm}
          >
            {pending ? 'Eliminando…' : 'Eliminar definitivamente'}
          </Button>
        </div>
      </div>
    </div>
  );
}
