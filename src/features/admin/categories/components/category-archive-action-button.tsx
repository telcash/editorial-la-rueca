'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { archiveCategoryAction, restoreCategoryAction } from '../actions/archive-category';

interface CategoryArchiveActionButtonProps {
  categoryId: string;
  isArchived: boolean;
}

export function CategoryArchiveActionButton({
  categoryId,
  isArchived,
}: CategoryArchiveActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isArchived) {
      startTransition(async () => {
        await restoreCategoryAction(categoryId);
      });
      return;
    }

    const confirmed = window.confirm(
      '¿Archivar esta categoría?\n\nLa categoría dejará de estar disponible para nuevas selecciones, pero se conservarán sus libros relacionados.',
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await archiveCategoryAction(categoryId);
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Guardando…' : isArchived ? 'Restaurar' : 'Archivar'}
    </Button>
  );
}
