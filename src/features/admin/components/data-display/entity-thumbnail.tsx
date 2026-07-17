import { ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

type EntityThumbnailVariant = 'avatar' | 'portrait' | 'cover' | 'square';

interface EntityThumbnailProps {
  src: string | null | undefined;
  alt: string;
  variant: EntityThumbnailVariant;
  className?: string;
}

const variantClasses: Record<EntityThumbnailVariant, string> = {
  avatar: 'size-11 rounded-md',
  portrait: 'h-24 w-20 rounded-md',
  cover: 'h-24 w-36 rounded-md',
  square: 'size-24 rounded-md',
};

export function EntityThumbnail({ src, alt, variant, className }: EntityThumbnailProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border border-border bg-muted text-muted-foreground',
        variantClasses[variant],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4" aria-hidden={alt ? undefined : true} aria-label={alt} />
      )}
    </div>
  );
}
