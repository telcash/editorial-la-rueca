'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { PermanentDeleteDialog } from '@/features/admin/components/permanent-delete-dialog';
import { deleteAuthorPermanentlyAction } from '../actions/delete-author-permanently';

interface AuthorPermanentDeleteButtonProps {
  authorId: string;
  authorName: string;
  bookCount: number;
}

function formatAuthorDependencyMessage(bookCount: number) {
  if (bookCount === 0) {
    return null;
  }

  const noun = bookCount === 1 ? 'libro' : 'libros';

  return `No se puede eliminar porque está relacionado con ${bookCount} ${noun}.`;
}

export function AuthorPermanentDeleteButton({
  authorId,
  authorName,
  bookCount,
}: AuthorPermanentDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dependencyMessage = formatAuthorDependencyMessage(bookCount);

  function handleOpen() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function handleConfirm(confirmation: string) {
    startTransition(async () => {
      const result = await deleteAuthorPermanentlyAction(authorId, confirmation);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
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
        onClick={handleOpen}
      >
        Eliminar definitivamente
      </Button>
      {isOpen ? (
        <PermanentDeleteDialog
          open={isOpen}
          title="Eliminar autor definitivamente"
          description="Esta acción no se puede deshacer."
          entityLabel={authorName}
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
