'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { PermanentDeleteDialog } from '@/features/admin/components/permanent-delete-dialog';
import { deleteContactRequestPermanentlyAction } from '../actions/delete-contact-request-permanently';

interface ContactRequestPermanentDeleteButtonProps {
  contactRequestId: string;
  entityLabel: string;
}

export function ContactRequestPermanentDeleteButton({
  contactRequestId,
  entityLabel,
}: ContactRequestPermanentDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm(confirmation: string) {
    startTransition(async () => {
      const result = await deleteContactRequestPermanentlyAction(contactRequestId, confirmation);

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
        onClick={() => {
          setErrorMessage(null);
          setIsOpen(true);
        }}
      >
        Eliminar solicitud definitivamente
      </Button>
      {isOpen ? (
        <PermanentDeleteDialog
          open={isOpen}
          title="Eliminar solicitud definitivamente"
          description="Esta acción eliminará definitivamente la solicitud y dejará de contabilizarse en las estadísticas del CRM."
          entityLabel={entityLabel}
          pending={isPending}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={() => setIsOpen(false)}
        />
      ) : null}
    </>
  );
}
