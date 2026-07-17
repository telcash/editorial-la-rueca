import { Badge } from '@/components/ui/badge';

interface FeaturedBadgeProps {
  isFeatured: boolean;
  featuredLabel?: string;
  notFeaturedLabel?: string;
}

export function FeaturedBadge({
  isFeatured,
  featuredLabel = 'Destacado',
  notFeaturedLabel = 'No destacado',
}: FeaturedBadgeProps) {
  return (
    <Badge variant={isFeatured ? 'secondary' : 'outline'}>
      {isFeatured ? featuredLabel : notFeaturedLabel}
    </Badge>
  );
}
