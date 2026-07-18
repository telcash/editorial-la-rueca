import { Badge } from '@/components/ui/badge';

interface ArchivedBadgeProps {
  isArchived: boolean;
}

export function ArchivedBadge({ isArchived }: ArchivedBadgeProps) {
  if (!isArchived) {
    return null;
  }

  return <Badge variant="outline">Archivado</Badge>;
}
