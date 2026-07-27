'use client';

import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';

import {
  BOOK_CARD_HEIGHT,
  BOOK_CARD_AUTHOR_HEIGHT,
  BOOK_CARD_RADIUS,
  BOOK_CARD_INFO_PADDING_X,
  BOOK_CARD_INFO_PADDING_Y,
  BOOK_CARD_TITLE_AUTHOR_GAP,
  BOOK_CARD_TITLE_HEIGHT,
  BOOK_CARD_WIDTH,
  BOOK_COVER_HEIGHT,
  BOOK_INFO_HEIGHT,
  BOOK_PREVIEW_CLOSE_DELAY_MS,
  BOOK_PREVIEW_HEIGHT,
  BOOK_PREVIEW_HOVER_DELAY_MS,
  BOOK_PREVIEW_WIDTH,
  computeBookPreviewPosition,
  getBookMetaSummary,
  getBookPreviewDescription,
  isBookNewRelease,
  isHoverPreviewAvailable,
  selectPrimaryBookEdition,
  type BookCardPreviewPosition,
} from '@/features/public/books/book-card.helpers';
import type { BookWithDetails } from '@/services/books/book.types';
import { cn } from '@/lib/utils';

interface BookCardProps {
  book: BookWithDetails;
  className?: string;
}

interface BookCoverProps {
  title: string;
  coverUrl: string | null;
  priority?: boolean;
  className?: string;
  imageSizes: string;
  coverHeight?: number;
  radius?: number;
  flush?: boolean;
}

function BookCover({
  title,
  coverUrl,
  priority = false,
  className,
  imageSizes,
  coverHeight,
  radius,
  flush = false,
}: BookCoverProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const shouldShowImage = Boolean(coverUrl) && !hasImageError;
  const imageSrc = shouldShowImage ? coverUrl : null;

  return (
    <div
      className={cn(
        'relative aspect-[2/3] overflow-hidden rounded-[10px] border border-public-border bg-[#f4f0eb]',
        className,
      )}
      style={{
        height: coverHeight,
        borderRadius: radius,
      }}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`Portada de ${title}`}
          fill
          sizes={imageSizes}
          className={cn(
            'object-contain transition duration-300 group-hover:brightness-[1.04]',
            flush ? null : 'p-2',
          )}
          priority={priority}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <div
          className={cn(
            'absolute flex flex-col items-center justify-center bg-white/70 text-center text-public-muted',
            flush ? 'inset-0' : 'inset-3 rounded-lg border border-public-border',
          )}
        >
          <BookOpen className="size-10 text-public-red" aria-hidden="true" />
          <span className="mt-3 px-2 font-serif-public text-sm font-semibold leading-tight text-public-ink">
            Editorial La Rueca
          </span>
        </div>
      )}
    </div>
  );
}

function BookCardPreview({
  book,
  position,
  onMouseEnter,
  onMouseLeave,
}: {
  book: BookWithDetails;
  position: BookCardPreviewPosition;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const authors = book.authors.map((author) => author.name).join(', ');
  const primaryEdition = selectPrimaryBookEdition(book.editions);
  const description = getBookPreviewDescription(book);
  const metaItems = getBookMetaSummary(primaryEdition);
  const category = book.categories.at(0);
  const isNew = isBookNewRelease(book);

  return createPortal(
    <aside
      role="dialog"
      aria-label={`Vista rápida de ${book.title}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 hidden rounded-xl border border-public-border bg-white p-3 opacity-100 shadow-[0_24px_80px_rgba(23,23,23,0.24)] transition duration-200 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 lg:block"
      style={{
        left: position.left,
        top: position.top,
        width: BOOK_PREVIEW_WIDTH,
        minHeight: BOOK_PREVIEW_HEIGHT,
        transformOrigin: `${position.originX}px ${position.originY}px`,
      }}
    >
      <div className="grid grid-cols-[0.4fr_0.6fr] gap-4">
        <BookCover
          title={book.title}
          coverUrl={book.coverUrl}
          imageSizes="190px"
          className="rounded-lg border-public-border/80"
        />
        <div className="flex min-w-0 flex-col py-1">
          <div className="flex flex-wrap gap-2">
            {book.isFeatured ? (
              <span className="rounded-full bg-public-red px-2.5 py-1 text-xs font-bold text-white">
                Destacado
              </span>
            ) : null}
            {isNew ? (
              <span className="rounded-full bg-public-red-soft px-2.5 py-1 text-xs font-bold text-public-red">
                Novedad
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 line-clamp-2 font-serif-public text-2xl font-semibold leading-tight text-public-ink">
            {book.title}
          </h3>
          {authors ? (
            <p className="mt-2 line-clamp-2 text-sm font-medium text-public-muted">{authors}</p>
          ) : null}
          {description ? (
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-public-ink/75">{description}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-public-muted">
            {category ? (
              <span className="rounded-full bg-public-surface-subtle px-2.5 py-1">
                {category.name}
              </span>
            ) : null}
            {metaItems.map((item) => (
              <span key={item} className="rounded-full bg-public-surface-subtle px-2.5 py-1">
                {item}
              </span>
            ))}
          </div>
          <Link
            href={`/libros/${book.slug}`}
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-public-red px-4 py-2 text-sm font-bold text-white transition hover:bg-public-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2"
          >
            Ver libro
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>,
    document.body,
  );
}

export function BookCard({ book, className }: BookCardProps) {
  const previewId = useId();
  const cardRef = useRef<HTMLAnchorElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<BookCardPreviewPosition | null>(null);
  const authors = book.authors.map((author) => author.name).join(', ');

  function clearTimer(timerRef: typeof openTimerRef) {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function updatePreviewPosition() {
    const element = cardRef.current;

    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setPreviewPosition(
      computeBookPreviewPosition(rect, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    );
  }

  function openPreviewWithDelay() {
    if (!isHoverCapable) {
      return;
    }

    clearTimer(closeTimerRef);
    clearTimer(openTimerRef);
    openTimerRef.current = setTimeout(() => {
      updatePreviewPosition();
      setIsPreviewOpen(true);
    }, BOOK_PREVIEW_HOVER_DELAY_MS);
  }

  function openPreviewImmediately() {
    if (!isHoverCapable) {
      return;
    }

    clearTimer(closeTimerRef);
    clearTimer(openTimerRef);
    updatePreviewPosition();
    setIsPreviewOpen(true);
  }

  function closePreviewWithDelay() {
    clearTimer(openTimerRef);
    clearTimer(closeTimerRef);
    closeTimerRef.current = setTimeout(() => {
      setIsPreviewOpen(false);
    }, BOOK_PREVIEW_CLOSE_DELAY_MS);
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const updateHoverCapability = () => {
      setIsHoverCapable(isHoverPreviewAvailable(mediaQuery.matches));
    };

    updateHoverCapability();
    mediaQuery.addEventListener('change', updateHoverCapability);

    return () => mediaQuery.removeEventListener('change', updateHoverCapability);
  }, []);

  useEffect(() => {
    if (!isPreviewOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPreviewOpen(false);
      }
    }

    function handleResize() {
      updatePreviewPosition();
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    return () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
    };
  }, []);

  return (
    <>
      <Link
        ref={cardRef}
        href={`/libros/${book.slug}`}
        aria-label={`Ver libro ${book.title}${authors ? `, de ${authors}` : ''}`}
        aria-describedby={isPreviewOpen ? previewId : undefined}
        onMouseEnter={openPreviewWithDelay}
        onMouseLeave={closePreviewWithDelay}
        onFocus={openPreviewImmediately}
        onBlur={closePreviewWithDelay}
        className={cn(
          'group block h-full w-full rounded-[10px] border border-public-border bg-white shadow-[0_8px_22px_rgba(23,23,23,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(23,23,23,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-public-red focus-visible:ring-offset-2',
          isPreviewOpen && isHoverCapable ? 'opacity-0' : 'opacity-100',
          className,
        )}
        style={{
          width: BOOK_CARD_WIDTH,
          height: BOOK_CARD_HEIGHT,
          borderRadius: BOOK_CARD_RADIUS,
        }}
      >
        <article
          className="flex h-full flex-col overflow-hidden"
          style={{ borderRadius: BOOK_CARD_RADIUS }}
        >
          <div className="bg-[#f4f0eb]">
            <BookCover
              title={book.title}
              coverUrl={book.coverUrl}
              imageSizes="(min-width: 1280px) 170px, (min-width: 768px) 160px, 44vw"
              coverHeight={BOOK_COVER_HEIGHT}
              radius={0}
              flush
              className="w-full rounded-none border-0"
            />
          </div>
          <div
            className="flex shrink-0 flex-col justify-end"
            style={{
              height: BOOK_INFO_HEIGHT,
              padding: `${BOOK_CARD_INFO_PADDING_Y}px ${BOOK_CARD_INFO_PADDING_X}px`,
            }}
          >
            <h2
              className="line-clamp-2 font-serif-public text-[15px] font-semibold leading-[18px] text-public-ink"
              style={{ height: BOOK_CARD_TITLE_HEIGHT }}
            >
              {book.title}
            </h2>
            {authors ? (
              <p
                className="line-clamp-2 text-[13px] font-normal leading-[15px] tracking-normal text-public-muted"
                style={{
                  height: BOOK_CARD_AUTHOR_HEIGHT,
                  marginTop: BOOK_CARD_TITLE_AUTHOR_GAP,
                }}
              >
                {authors}
              </p>
            ) : (
              <span
                aria-hidden="true"
                style={{
                  height: BOOK_CARD_AUTHOR_HEIGHT,
                  marginTop: BOOK_CARD_TITLE_AUTHOR_GAP,
                }}
              />
            )}
          </div>
        </article>
      </Link>

      {isPreviewOpen && previewPosition ? (
        <span id={previewId} className="sr-only">
          Vista rápida disponible. Pulsa Escape para cerrarla.
        </span>
      ) : null}

      {isPreviewOpen && previewPosition ? (
        <BookCardPreview
          book={book}
          position={previewPosition}
          onMouseEnter={() => clearTimer(closeTimerRef)}
          onMouseLeave={closePreviewWithDelay}
        />
      ) : null}
    </>
  );
}
