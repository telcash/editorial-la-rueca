'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

export interface BulkActionOption<TAction extends string> {
  value: TAction;
  label: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface BulkActionResult {
  requested: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface BulkActionToolbarProps<TAction extends string> {
  selectedCount: number;
  actions: Array<BulkActionOption<TAction>>;
  onAction: (action: TAction) => Promise<BulkActionResult>;
  onClearSelection: () => void;
}

function formatResult(result: BulkActionResult) {
  return `${result.updated} actualizados, ${result.skipped} omitidos, ${result.errors} errores.`;
}

export function BulkActionToolbar<TAction extends string>({
  selectedCount,
  actions,
  onAction,
  onClearSelection,
}: BulkActionToolbarProps<TAction>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleAction(action: BulkActionOption<TAction>) {
    if (selectedCount === 0 || isPending) {
      return;
    }

    if (action.requiresConfirmation) {
      const confirmed = window.confirm(
        action.confirmationMessage ?? '¿Aplicar esta acción masiva?',
      );

      if (!confirmed) {
        return;
      }
    }

    startTransition(async () => {
      const result = await onAction(action.value);
      setMessage(formatResult(result));
      onClearSelection();
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{selectedCount} seleccionados</p>
          {message ? (
            <p role="status" className="mt-1 text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.value}
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedCount === 0 || isPending}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
