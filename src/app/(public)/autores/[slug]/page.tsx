import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink, UserRound } from 'lucide-react';

import { BookCard } from '@/components/public/book-card';
import { PublicCard } from '@/components/public/public-card';
import { PublicContainer } from '@/components/public/public-container';
import { PublicSection } from '@/components/public/public-section';
import { SectionHeading } from '@/components/public/section-heading';
import { toPlainPublicText } from '@/features/public/lib/text-format';
import { AuthorNotFoundError } from '@/services/authors/author.errors';
import * as AuthorService from '@/services/authors/author.service';
import * as BookService from '@/services/books/book.service';

interface PublicAuthorDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getPublicAuthor(slug: string) {
  try {
    return await AuthorService.getPublishedAuthorBySlug(slug);
  } catch (error) {
    if (error instanceof AuthorNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export async function generateMetadata({ params }: PublicAuthorDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);

  return {
    title: `${author.name} | Editorial La Rueca`,
    description: toPlainPublicText(author.shortBio ?? author.biography) ?? undefined,
  };
}

function AuthorPhoto({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-public-border bg-public-surface-subtle shadow-[0_18px_50px_rgba(23,23,23,0.08)]">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          fill
          sizes="(min-width: 1024px) 33vw, 90vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center text-public-muted">
          <UserRound className="size-20" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function SocialLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return null;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-public-border bg-white px-4 py-2 text-sm font-bold text-public-ink transition hover:border-public-red hover:text-public-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
    >
      {label}
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  );
}

export default async function PublicAuthorDetailPage({ params }: PublicAuthorDetailPageProps) {
  const { slug } = await params;
  const author = await getPublicAuthor(slug);
  const shortBio = toPlainPublicText(author.shortBio);
  const biography = toPlainPublicText(author.biography);
  const books = await BookService.listPublishedBooksByAuthorId(author.id, 12);

  return (
    <>
      <PublicSection>
        <PublicContainer>
          <Link
            href="/autores"
            className="inline-flex items-center gap-2 text-sm font-bold text-public-red transition hover:text-public-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a autores
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(16rem,24rem)_1fr] lg:items-start">
            <AuthorPhoto name={author.name} photoUrl={author.photoUrl} />

            <div>
              {author.country ? (
                <p className="text-sm font-bold uppercase tracking-normal text-public-red">
                  {author.country}
                </p>
              ) : null}
              <h1 className="mt-3 font-serif-public text-[clamp(2.5rem,7vw,4.75rem)] font-semibold leading-[0.95] tracking-normal text-public-ink">
                {author.name}
              </h1>
              {shortBio ? (
                <p className="mt-5 max-w-3xl text-xl leading-8 text-public-muted">{shortBio}</p>
              ) : null}
              {biography ? (
                <div className="mt-8 max-w-3xl whitespace-pre-line text-base leading-8 text-public-ink/80">
                  {biography}
                </div>
              ) : null}

              {author.websiteUrl || author.instagramUrl || author.facebookUrl ? (
                <div className="mt-8 flex flex-wrap gap-3" aria-label="Enlaces del autor">
                  <SocialLink href={author.websiteUrl} label="Web" />
                  <SocialLink href={author.instagramUrl} label="Instagram" />
                  <SocialLink href={author.facebookUrl} label="Facebook" />
                </div>
              ) : null}
            </div>
          </div>
        </PublicContainer>
      </PublicSection>

      <PublicSection variant="compact">
        <PublicContainer>
          <SectionHeading title="Libros del autor" />
          {books.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <PublicCard className="p-6 text-sm leading-6 text-public-muted">
                Todavía no hay libros publicados asociados a este autor.
              </PublicCard>
            </div>
          )}
        </PublicContainer>
      </PublicSection>
    </>
  );
}
