import Link from 'next/link';

import type { BookWithDetails } from '@/services/books/book.types';

interface BookAuthorsLinksProps {
  authors: BookWithDetails['authors'];
}

function getAuthorSeparator(index: number, total: number) {
  if (index >= total - 1) {
    return '';
  }

  return index === total - 2 ? ' y ' : ', ';
}

export function BookAuthorsLinks({ authors }: BookAuthorsLinksProps) {
  if (authors.length === 0) {
    return null;
  }

  return (
    <p className="text-[0.9375rem] leading-6 text-public-muted md:text-base lg:text-[1.0625rem]">
      <span className="text-public-muted/85">Por </span>
      {authors.map((author, index) => (
        <span key={author.id}>
          <Link
            href={`/autores/${author.slug}`}
            className="font-semibold text-public-ink transition hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            {author.name}
          </Link>
          {getAuthorSeparator(index, authors.length)}
        </span>
      ))}
    </p>
  );
}
