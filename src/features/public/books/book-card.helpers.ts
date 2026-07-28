import { formatEditionFormat, formatPublicationYear } from '@/features/public/lib/book-format';
import { toPlainPublicText } from '@/features/public/lib/text-format';
import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';

export { selectPrimaryBookEdition } from './book-edition.helpers';

export const BOOK_CARD_WIDTH = 170;
export const BOOK_COVER_HEIGHT = 248;
export const BOOK_INFO_HEIGHT = 83;
export const BOOK_CARD_HEIGHT = BOOK_COVER_HEIGHT + BOOK_INFO_HEIGHT;
export const BOOK_CARD_RADIUS = 10;
export const BOOK_CARD_GRID_GAP = 20;
export const BOOK_CARD_INFO_PADDING_X = 12;
export const BOOK_CARD_INFO_PADDING_Y = 6;
export const BOOK_CARD_TITLE_HEIGHT = 36;
export const BOOK_CARD_AUTHOR_HEIGHT = 30;
export const BOOK_CARD_TITLE_AUTHOR_GAP = 5;
export const BOOK_PREVIEW_WIDTH = 468;
export const BOOK_PREVIEW_HEIGHT = 340;
export const BOOK_PREVIEW_MARGIN = 16;
export const BOOK_PREVIEW_HOVER_DELAY_MS = 500;
export const BOOK_PREVIEW_CLOSE_DELAY_MS = 120;
export const BOOK_PREVIEW_DESCRIPTION_LIMIT = 280;
export const BOOK_NEW_RELEASE_DAYS = 120;

export interface BookCardPreviewPosition {
  left: number;
  top: number;
  originX: number;
  originY: number;
  isHorizontallyAdjusted: boolean;
  isVerticallyAdjusted: boolean;
}

interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface ViewportLike {
  width: number;
  height: number;
}

export function getBookPreviewDescription(book: Pick<BookWithDetails, 'excerpt' | 'description'>) {
  const source = toPlainPublicText(book.excerpt) ?? toPlainPublicText(book.description);

  if (!source) {
    return null;
  }

  if (source.length <= BOOK_PREVIEW_DESCRIPTION_LIMIT) {
    return source;
  }

  return `${source.slice(0, BOOK_PREVIEW_DESCRIPTION_LIMIT).trimEnd()}…`;
}

export function isBookNewRelease(book: Pick<BookWithDetails, 'createdAt'>, now = new Date()) {
  const createdAt = book.createdAt instanceof Date ? book.createdAt : new Date(book.createdAt);
  const ageInMs = now.getTime() - createdAt.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  return ageInDays >= 0 && ageInDays <= BOOK_NEW_RELEASE_DAYS;
}

export function getBookMetaSummary(edition: BookEditionDetails | null) {
  if (!edition) {
    return [];
  }

  const year = formatPublicationYear(edition.publicationDate);
  const items = [
    year,
    edition.pages ? `${edition.pages} págs.` : null,
    edition.format ? formatEditionFormat(edition.format) : null,
    edition.editionLabel,
  ];

  return items.filter((item): item is string => Boolean(item));
}

export function isHoverPreviewAvailable(matchesHoverMedia: boolean) {
  return matchesHoverMedia;
}

export function computeBookPreviewPosition(
  cardRect: RectLike,
  viewport: ViewportLike,
): BookCardPreviewPosition {
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;
  const preferredLeft = cardCenterX - BOOK_PREVIEW_WIDTH / 2;
  const preferredTop = cardCenterY - BOOK_PREVIEW_HEIGHT / 2;
  const left = Math.min(
    Math.max(preferredLeft, BOOK_PREVIEW_MARGIN),
    viewport.width - BOOK_PREVIEW_WIDTH - BOOK_PREVIEW_MARGIN,
  );
  const top = Math.min(
    Math.max(preferredTop, BOOK_PREVIEW_MARGIN),
    viewport.height - BOOK_PREVIEW_HEIGHT - BOOK_PREVIEW_MARGIN,
  );
  const originX = Math.min(Math.max(cardCenterX - left, 0), BOOK_PREVIEW_WIDTH);
  const originY = Math.min(Math.max(cardCenterY - top, 0), BOOK_PREVIEW_HEIGHT);

  return {
    left,
    top,
    originX,
    originY,
    isHorizontallyAdjusted: left !== preferredLeft,
    isVerticallyAdjusted: top !== preferredTop,
  };
}
