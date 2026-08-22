import { Badge } from '@/components/ui/badge';
import type { ContactRequestStatus } from '@/schemas/contact-requests/contact-request.schema';
import { contactRequestStatusLabels } from '../lib/contact-request-labels';

interface ContactRequestStatusBadgeProps {
  status: ContactRequestStatus;
}

const statusVariant: Record<
  ContactRequestStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  new: 'default',
  contacted: 'secondary',
  in_progress: 'secondary',
  won: 'default',
  lost: 'outline',
};

export function ContactRequestStatusBadge({ status }: ContactRequestStatusBadgeProps) {
  return <Badge variant={statusVariant[status]}>{contactRequestStatusLabels[status]}</Badge>;
}
