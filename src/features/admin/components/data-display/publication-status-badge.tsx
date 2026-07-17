import { Badge } from '@/components/ui/badge';

interface PublicationStatusBadgeProps {
  isPublished: boolean;
  publishedLabel?: string;
  draftLabel?: string;
}

export function PublicationStatusBadge({
  isPublished,
  publishedLabel = 'Publicado',
  draftLabel = 'Borrador',
}: PublicationStatusBadgeProps) {
  return (
    <Badge variant={isPublished ? 'default' : 'outline'}>
      {isPublished ? publishedLabel : draftLabel}
    </Badge>
  );
}
