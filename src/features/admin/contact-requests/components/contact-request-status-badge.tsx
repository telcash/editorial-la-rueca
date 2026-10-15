import { Badge } from '@/components/ui/badge';
interface ContactRequestStatusBadgeProps {
  label: string;
  classification: 'open' | 'won' | 'lost';
}

const classificationVariant: Record<'open' | 'won' | 'lost', 'default' | 'secondary' | 'outline'> =
  {
    open: 'secondary',
    won: 'default',
    lost: 'outline',
  };

export function ContactRequestStatusBadge({
  label,
  classification,
}: ContactRequestStatusBadgeProps) {
  return <Badge variant={classificationVariant[classification]}>{label}</Badge>;
}
