import type { ContactRequestSource } from '@/schemas/contact-requests/contact-request.schema';

export const contactRequestSourceLabels: Record<ContactRequestSource, string> = {
  website: 'Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  direct: 'Directo',
  other: 'Otro',
  meta_instant_form: 'Meta Ads',
};
