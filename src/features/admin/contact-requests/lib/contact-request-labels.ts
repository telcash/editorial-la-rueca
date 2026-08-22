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
