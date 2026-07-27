import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';

import type { Author } from '@/db/schema';
import { toPlainPublicText } from '@/features/public/lib/text-format';
import { PublicCard } from './public-card';

interface AuthorCardProps {
  author: Author;
}

export function AuthorCard({ author }: AuthorCardProps) {
  const shortBio = toPlainPublicText(author.shortBio ?? author.biography);

  return (
    <PublicCard className="group flex h-full flex-col overflow-hidden p-0">
      <Link
        href={`/autores/${author.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
      >
        <div
          data-author-card-image="true"
          className="relative aspect-[4/3] overflow-hidden bg-public-surface-subtle"
        >
          {author.photoUrl ? (
            <Image
              src={author.photoUrl}
              alt={`Foto de ${author.name}`}
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 220px, 82vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-public-muted">
              <UserRound className="size-11" aria-hidden="true" />
            </div>
          )}
        </div>
      </Link>

      <div data-author-card-info="true" className="flex h-[9.5rem] shrink-0 flex-col p-4">
        <h2 className="line-clamp-2 h-11 font-serif-public text-lg font-semibold leading-tight text-public-ink">
          <Link
            href={`/autores/${author.slug}`}
            className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            {author.name}
          </Link>
        </h2>
        {shortBio ? (
          <p className="mt-2 line-clamp-2 h-10 text-sm leading-5 text-public-muted">{shortBio}</p>
        ) : (
          <span aria-hidden="true" className="mt-2 block h-10" />
        )}
        <Link
          href={`/autores/${author.slug}`}
          className="mt-auto inline-flex w-fit items-center gap-2 pt-4 text-sm font-bold text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          Ver autor
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </PublicCard>
  );
}
