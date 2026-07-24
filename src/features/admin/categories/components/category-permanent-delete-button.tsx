'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { PermanentDeleteDialog } from '@/features/admin/components/permanent-delete-dialog';
import { navigateWithFeedback } from '@/features/admin/lib/client-feedback-navigation';
import { deleteCategoryPermanentlyAction } from '../actions/delete-category-permanently';

interface CategoryPermanentDeleteButtonProps {
  categoryId: string;
  categoryName: string;
  bookCount: number;
}

function formatCategoryDependencyMessage(bookCount: number) {
  if (bookCount === 0) {
    return null;
  }

  const noun = bookCount === 1 ? 'libro' : 'libros';

  return `No se puede eliminar porque está relacionada con ${bookCount} ${noun}.`;
}

export function CategoryPermanentDeleteButton({
  categoryId,
  categoryName,
  bookCount,
}: CategoryPermanentDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dependencyMessage = formatCategoryDependencyMessage(bookCount);

  function handleConfirm(confirmation: string) {
    startTransition(async () => {
      const result = await deleteCategoryPermanentlyAction(categoryId, confirmation);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
      navigateWithFeedback('categoryDeleted');
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={bookCount > 0}
        title={dependencyMessage ?? undefined}
        onClick={() => {
          setErrorMessage(null);
          setIsOpen(true);
        }}
      >
        Eliminar definitivamente
      </Button>
      {isOpen ? (
        <PermanentDeleteDialog
          open={isOpen}
          title="Eliminar categoría definitivamente"
          description="Esta acción no se puede deshacer."
          entityLabel={categoryName}
          dependencyMessage={dependencyMessage}
          pending={isPending}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
