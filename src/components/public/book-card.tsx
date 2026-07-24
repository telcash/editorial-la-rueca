import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';

import { toPlainPublicText } from '@/features/public/lib/text-format';
import type { BookWithDetails } from '@/services/books/book.types';
import { PublicCard } from './public-card';

interface BookCardProps {
  book: BookWithDetails;
}

export function BookCard({ book }: BookCardProps) {
  const authorNames = book.authors.map((author) => author.name).join(', ');
  const primaryCategory = book.categories.at(0);
  const excerpt = toPlainPublicText(book.excerpt ?? book.description);

  return (
    <PublicCard className="group flex h-full flex-col overflow-hidden p-0">
      <Link
        href={`/libros/${book.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-public-surface-subtle">
          {book.coverUrl ? (
            <Image
              src={book.coverUrl}
              alt={`Portada de ${book.title}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 80vw"
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-public-muted">
              <BookOpen className="size-14" aria-hidden="true" />
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {primaryCategory ? (
          <Link
            href={`/libros?category=${primaryCategory.slug}`}
            className="mb-2 w-fit text-xs font-bold uppercase tracking-normal text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            {primaryCategory.name}
          </Link>
        ) : null}
        <h2 className="font-serif-public text-xl font-semibold leading-tight text-public-ink">
          <Link
            href={`/libros/${book.slug}`}
            className="transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            {book.title}
          </Link>
        </h2>
        {authorNames ? <p className="mt-2 text-sm text-public-muted">{authorNames}</p> : null}
        {excerpt ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-public-muted">{excerpt}</p>
        ) : null}
        <Link
          href={`/libros/${book.slug}`}
          className="mt-auto inline-flex w-fit items-center gap-2 pt-5 text-sm font-bold text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
        >
          Ver libro
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </PublicCard>
  );
}
