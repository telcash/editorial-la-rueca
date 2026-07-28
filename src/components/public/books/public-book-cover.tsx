import Image from 'next/image';
import { BookOpen } from 'lucide-react';

import { cn } from '@/lib/utils';

interface PublicBookCoverProps {
  coverUrl: string | null;
  title: string;
  priority?: boolean;
  className?: string;
}

export function PublicBookCover({
  coverUrl,
  title,
  priority = false,
  className,
}: PublicBookCoverProps) {
  return (
    <div
      className={cn(
        'relative mx-auto aspect-[2/3] w-[68%] max-w-[20rem] overflow-hidden rounded-2xl border border-public-border bg-[#f5f0e8] p-3 shadow-[0_22px_60px_rgba(23,23,23,0.12)] sm:w-[62%] lg:w-full lg:max-w-[21rem]',
        className,
      )}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={`Portada de ${title}`}
          fill
          sizes="(min-width: 1280px) 320px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 72vw"
          className="object-contain p-3"
          priority={priority}
        />
      ) : (
        <div
          role="img"
          aria-label={`Portada no disponible para ${title}`}
          className="absolute inset-3 flex flex-col items-center justify-center rounded-xl border border-public-border bg-white/75 px-5 text-center text-public-muted"
        >
          <BookOpen className="size-14 text-public-red" aria-hidden="true" />
          <span className="mt-4 font-serif-public text-lg font-semibold leading-tight text-public-ink">
            Portada no disponible
          </span>
        </div>
      )}
    </div>
  );
}
