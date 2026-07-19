import Image from 'next/image';
import { Play, Quote } from 'lucide-react';

import type { EditorialVideoContent } from '@/content/public-home';
import { PublicCard } from './public-card';
import { PublicCtaLink } from './public-cta-link';

interface EditorialVideoProps {
  content: EditorialVideoContent;
}

export function EditorialVideo({ content }: EditorialVideoProps) {
  return (
    <PublicCard className="grid overflow-hidden p-3 md:grid-cols-[1.15fr_1fr] md:p-4 lg:p-5">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[linear-gradient(135deg,#eee8df,#ffffff)]">
        {content.posterUrl ? (
          <Image
            src={content.posterUrl}
            alt="Presentación editorial de Almudena"
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_24%,rgba(224,43,32,0.16),transparent_30%)]" />
            <div className="absolute inset-x-8 bottom-8 top-10 rounded-t-full bg-public-border/55" />
          </>
        )}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 inline-flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-public-red shadow-[0_12px_30px_rgba(23,23,23,0.16)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          <Play className="ml-1 size-7 fill-current" aria-hidden="true" />
        </span>
        <span className="sr-only">Video de presentación pendiente de integrar.</span>
      </div>
      <div className="flex flex-col justify-center p-5 md:p-8">
        <h2 className="font-serif-public text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-public-ink">
          {content.title}
        </h2>
        <p className="mt-1 text-sm font-bold text-public-red">{content.subtitle}</p>
        <p className="mt-4 text-sm leading-7 text-public-muted md:text-base">
          {content.description}
        </p>
        <blockquote className="mt-6 rounded-2xl bg-public-surface-subtle p-5 text-sm leading-6 text-public-ink/80">
          <Quote className="mb-3 size-7 text-public-red" aria-hidden="true" />
          {content.quote}
        </blockquote>
        <PublicCtaLink href="#testimonios" className="mt-5">
          Ver más testimonios
        </PublicCtaLink>
      </div>
    </PublicCard>
  );
}

// TODO: Conectar videoUrl/posterUrl reales cuando la editorial los apruebe.
