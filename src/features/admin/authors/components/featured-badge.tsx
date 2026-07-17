import { Badge } from '@/components/ui/badge';

interface FeaturedBadgeProps {
  isFeatured: boolean;
}

export function FeaturedBadge({ isFeatured }: FeaturedBadgeProps) {
  return (
    <Badge variant={isFeatured ? 'secondary' : 'outline'}>
      {isFeatured ? 'Destacado' : 'No destacado'}
    </Badge>
  );
}
