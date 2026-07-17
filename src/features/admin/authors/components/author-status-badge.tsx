import { Badge } from '@/components/ui/badge';

interface AuthorStatusBadgeProps {
  isPublished: boolean;
}

export function AuthorStatusBadge({ isPublished }: AuthorStatusBadgeProps) {
  return (
    <Badge variant={isPublished ? 'default' : 'outline'}>
      {isPublished ? 'Publicado' : 'Borrador'}
    </Badge>
  );
}
