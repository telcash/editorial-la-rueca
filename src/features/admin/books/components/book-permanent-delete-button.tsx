'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { PermanentDeleteDialog } from '@/features/admin/components/permanent-delete-dialog';
import { deleteBookPermanentlyAction } from '../actions/delete-book-permanently';

interface BookPermanentDeleteButtonProps {
  bookId: string;
  bookTitle: string;
}

export function BookPermanentDeleteButton({ bookId, bookTitle }: BookPermanentDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setErrorMessage(null);
    setIsOpen(true);
  }

  function handleConfirm(confirmation: string) {
    startTransition(async () => {
      const result = await deleteBookPermanentlyAction(bookId, confirmation);

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsOpen(false);
    });
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={handleOpen}>
        Eliminar definitivamente
      </Button>
      {isOpen ? (
        <PermanentDeleteDialog
          open={isOpen}
          title="Eliminar libro definitivamente"
          description="Esta acción no se puede deshacer."
          entityLabel={bookTitle}
          pending={isPending}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
