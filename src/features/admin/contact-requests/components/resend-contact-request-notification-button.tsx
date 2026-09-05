'use client';

import { useTransition } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { navigateWithFeedback } from '@/features/admin/lib/client-feedback-navigation';
import { resendContactRequestNotificationAction } from '../actions/resend-contact-request-notification';

interface ResendContactRequestNotificationButtonProps {
  contactRequestId: string;
  hasEmailSentAt: boolean;
}

export function ResendContactRequestNotificationButton({
  contactRequestId,
  hasEmailSentAt,
}: ResendContactRequestNotificationButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (hasEmailSentAt) {
      const confirmed = window.confirm(
        '¿Enviar de nuevo la notificación interna de esta solicitud?',
      );

      if (!confirmed) {
        return;
      }
    }

    startTransition(async () => {
      const result = await resendContactRequestNotificationAction(contactRequestId);

      navigateWithFeedback(result.feedback);
    });
  }

  return (
    <Button type="button" variant="outline" disabled={isPending} onClick={handleClick}>
      <Send className="size-4" aria-hidden="true" />
      {isPending ? 'Enviando…' : hasEmailSentAt ? 'Enviar de nuevo' : 'Reenviar notificación'}
    </Button>
  );
}
