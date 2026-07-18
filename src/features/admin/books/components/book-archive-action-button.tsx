'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { archiveBookAction, restoreBookAction } from '../actions/archive-book';

interface BookArchiveActionButtonProps {
  bookId: string;
  isArchived: boolean;
}

export function BookArchiveActionButton({ bookId, isArchived }: BookArchiveActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isArchived) {
      startTransition(async () => {
        await restoreBookAction(bookId);
      });
      return;
    }

    const confirmed = window.confirm(
      '¿Archivar este libro?\n\nEl libro dejará de aparecer en las vistas activas y públicas, pero conservará todos sus datos, autores y ediciones.',
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await archiveBookAction(bookId);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Guardando…' : isArchived ? 'Restaurar' : 'Archivar'}
    </Button>
  );
}
