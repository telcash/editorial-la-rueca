'use client';

import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { navigateWithFeedback } from '@/features/admin/lib/client-feedback-navigation';
import { archiveServiceAction, restoreServiceAction } from '../actions/archive-service';

interface ServiceArchiveActionButtonProps {
  serviceId: string;
  isArchived: boolean;
}

export function ServiceArchiveActionButton({
  serviceId,
  isArchived,
}: ServiceArchiveActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (isArchived) {
      startTransition(async () => {
        await restoreServiceAction(serviceId);
        navigateWithFeedback('serviceRestored');
      });
      return;
    }

    const confirmed = window.confirm(
      '¿Archivar este servicio?\n\nEl servicio dejará de estar disponible para futuras selecciones públicas, pero se conservará para histórico y analítica.',
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await archiveServiceAction(serviceId);
      navigateWithFeedback('serviceArchived');
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Guardando…' : isArchived ? 'Restaurar' : 'Archivar'}
    </Button>
  );
}
