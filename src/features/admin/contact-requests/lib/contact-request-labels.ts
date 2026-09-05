import type {
  ContactRequestSource,
  ContactRequestStatus,
} from '@/schemas/contact-requests/contact-request.schema';

export const contactRequestStatusLabels: Record<ContactRequestStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  in_progress: 'En seguimiento',
  won: 'Ganado',
  lost: 'Perdido',
};

export const contactRequestSourceLabels: Record<ContactRequestSource, string> = {
  website: 'Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  direct: 'Directo',
  other: 'Otro',
};

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
