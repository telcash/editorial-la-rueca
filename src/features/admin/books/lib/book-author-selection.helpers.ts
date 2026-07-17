import type { BookFormAuthorSummary } from '../types/book-form-state';

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function addSelectedAuthor(
  selectedAuthors: BookFormAuthorSummary[],
  author: BookFormAuthorSummary,
): BookFormAuthorSummary[] {
  if (selectedAuthors.some((selectedAuthor) => selectedAuthor.id === author.id)) {
    return selectedAuthors;
  }

  return [...selectedAuthors, author];
}

export function removeSelectedAuthor(
  selectedAuthors: BookFormAuthorSummary[],
  authorId: string,
): BookFormAuthorSummary[] {
  return selectedAuthors.filter((author) => author.id !== authorId);
}

export function moveSelectedAuthorUp(
  selectedAuthors: BookFormAuthorSummary[],
  authorId: string,
): BookFormAuthorSummary[] {
  const currentIndex = selectedAuthors.findIndex((author) => author.id === authorId);

  if (currentIndex <= 0) {
    return selectedAuthors;
  }

  const nextAuthors = [...selectedAuthors];
  const previousAuthor = nextAuthors[currentIndex - 1];
  const currentAuthor = nextAuthors[currentIndex];

  if (!previousAuthor || !currentAuthor) {
    return selectedAuthors;
  }

  nextAuthors[currentIndex - 1] = currentAuthor;
  nextAuthors[currentIndex] = previousAuthor;

  return nextAuthors;
}

export function moveSelectedAuthorDown(
  selectedAuthors: BookFormAuthorSummary[],
  authorId: string,
): BookFormAuthorSummary[] {
  const currentIndex = selectedAuthors.findIndex((author) => author.id === authorId);

  if (currentIndex === -1 || currentIndex >= selectedAuthors.length - 1) {
    return selectedAuthors;
  }

  const nextAuthors = [...selectedAuthors];
  const nextAuthor = nextAuthors[currentIndex + 1];
  const currentAuthor = nextAuthors[currentIndex];

  if (!nextAuthor || !currentAuthor) {
    return selectedAuthors;
  }

  nextAuthors[currentIndex] = nextAuthor;
  nextAuthors[currentIndex + 1] = currentAuthor;

  return nextAuthors;
}

export function getAuthorIds(selectedAuthors: BookFormAuthorSummary[]): string[] {
  return selectedAuthors.map((author) => author.id);
}

export function filterAvailableAuthors(
  authors: BookFormAuthorSummary[],
  selectedAuthors: BookFormAuthorSummary[],
  query: string,
): BookFormAuthorSummary[] {
  const selectedAuthorIds = new Set(getAuthorIds(selectedAuthors));
  const normalizedQuery = normalizeSearchValue(query);

  return authors.filter((author) => {
    if (selectedAuthorIds.has(author.id)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      normalizeSearchValue(author.name).includes(normalizedQuery) ||
      normalizeSearchValue(author.slug).includes(normalizedQuery)
    );
  });
}
