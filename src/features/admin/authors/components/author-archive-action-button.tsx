'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { archiveAuthorAction, restoreAuthorAction } from '../actions/archive-author';

interface AuthorArchiveActionButtonProps {
  authorId: string;
  isArchived: boolean;
}

export function AuthorArchiveActionButton({
  authorId,
  isArchived,
}: AuthorArchiveActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isArchived) {
      startTransition(async () => {
        await restoreAuthorAction(authorId);
      });
      return;
    }

    const confirmed = window.confirm(
      '¿Archivar este autor?\n\nEl autor dejará de estar disponible para nuevas selecciones, pero se conservarán sus libros y relaciones existentes.',
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await archiveAuthorAction(authorId);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Guardando…' : isArchived ? 'Restaurar' : 'Archivar'}
    </Button>
  );
}
