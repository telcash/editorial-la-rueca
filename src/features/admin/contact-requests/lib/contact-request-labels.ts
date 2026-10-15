import { contactRequestSourceLabels } from '@/services/contact-requests/contact-request-source';

export { contactRequestSourceLabels };

export type ContactRequestEmailStatus = 'sent' | 'error' | 'pending';

export function getContactRequestEmailStatus({
  emailSentAt,
  emailError,
}: Pick<
  { emailSentAt: Date | null; emailError: string | null },
  'emailSentAt' | 'emailError'
>): ContactRequestEmailStatus {
  if (emailSentAt) {
    return 'sent';
  }

  if (emailError) {
    return 'error';
  }

  return 'pending';
}

export const contactRequestEmailStatusLabels: Record<ContactRequestEmailStatus, string> = {
  sent: 'Email enviada',
  error: 'Error de email',
  pending: 'Email pendiente',
};
