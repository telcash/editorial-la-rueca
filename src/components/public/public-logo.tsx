import Link from 'next/link';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface PublicLogoProps {
  variant?: 'header' | 'footer';
  className?: string;
}

export function PublicLogo({ variant = 'header', className }: PublicLogoProps) {
  const isFooter = variant === 'footer';

  return (
    <Link
      href="/"
      aria-label="Editorial La Rueca"
      className={cn(
        'inline-flex items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2',
        isFooter ? 'w-[178px]' : 'w-[88px] sm:w-[104px] xl:w-[124px]',
        className,
      )}
    >
      <Image
        src="/brand/logo-la-rueca.webp"
        alt="Editorial La Rueca"
        width={500}
        height={182}
        priority={variant === 'header'}
        className="h-auto w-full"
        sizes={isFooter ? '178px' : '(min-width: 1280px) 124px, (min-width: 640px) 104px, 88px'}
      />
    </Link>
  );
}
