import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  contactRequestEmailStatusLabels,
  getContactRequestEmailStatus,
} from '../lib/contact-request-labels';

interface ContactRequestEmailStatusBadgeProps {
  emailSentAt: Date | null;
  emailError: string | null;
}

const statusVariant = {
  sent: 'default',
  error: 'destructive',
  pending: 'secondary',
} as const;

const statusIcons = {
  sent: CheckCircle2,
  error: AlertCircle,
  pending: Clock3,
} as const;

export function ContactRequestEmailStatusBadge({
  emailSentAt,
  emailError,
}: ContactRequestEmailStatusBadgeProps) {
  const status = getContactRequestEmailStatus({ emailSentAt, emailError });
  const Icon = statusIcons[status];

  return (
    <Badge variant={statusVariant[status]}>
      <Icon className="size-3" aria-hidden="true" />
      {contactRequestEmailStatusLabels[status]}
    </Badge>
  );
}
