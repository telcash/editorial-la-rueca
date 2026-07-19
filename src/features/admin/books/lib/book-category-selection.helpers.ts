import type { BookFormCategorySummary } from '../types/book-form-state';

function normalizeSearchValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function addSelectedCategory(
  selectedCategories: BookFormCategorySummary[],
  category: BookFormCategorySummary,
): BookFormCategorySummary[] {
  if (selectedCategories.some((selectedCategory) => selectedCategory.id === category.id)) {
    return selectedCategories;
  }

  return [...selectedCategories, category];
}

export function removeSelectedCategory(
  selectedCategories: BookFormCategorySummary[],
  categoryId: string,
): BookFormCategorySummary[] {
  return selectedCategories.filter((category) => category.id !== categoryId);
}

export function moveSelectedCategoryUp(
  selectedCategories: BookFormCategorySummary[],
  categoryId: string,
): BookFormCategorySummary[] {
  const currentIndex = selectedCategories.findIndex((category) => category.id === categoryId);

  if (currentIndex <= 0) {
    return selectedCategories;
  }

  const nextCategories = [...selectedCategories];
  const previousCategory = nextCategories[currentIndex - 1];
  const currentCategory = nextCategories[currentIndex];

  if (!previousCategory || !currentCategory) {
    return selectedCategories;
  }

  nextCategories[currentIndex - 1] = currentCategory;
  nextCategories[currentIndex] = previousCategory;

  return nextCategories;
}

export function moveSelectedCategoryDown(
  selectedCategories: BookFormCategorySummary[],
  categoryId: string,
): BookFormCategorySummary[] {
  const currentIndex = selectedCategories.findIndex((category) => category.id === categoryId);

  if (currentIndex === -1 || currentIndex >= selectedCategories.length - 1) {
    return selectedCategories;
  }

  const nextCategories = [...selectedCategories];
  const nextCategory = nextCategories[currentIndex + 1];
  const currentCategory = nextCategories[currentIndex];

  if (!nextCategory || !currentCategory) {
    return selectedCategories;
  }

  nextCategories[currentIndex] = nextCategory;
  nextCategories[currentIndex + 1] = currentCategory;

  return nextCategories;
}

export function getCategoryIds(selectedCategories: BookFormCategorySummary[]): string[] {
  return selectedCategories.map((category) => category.id);
}

export function filterAvailableCategories(
  categories: BookFormCategorySummary[],
  selectedCategories: BookFormCategorySummary[],
  query: string,
): BookFormCategorySummary[] {
  const selectedCategoryIds = new Set(getCategoryIds(selectedCategories));
  const normalizedQuery = normalizeSearchValue(query);

  return categories.filter((category) => {
    if (selectedCategoryIds.has(category.id)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      normalizeSearchValue(category.name).includes(normalizedQuery) ||
      normalizeSearchValue(category.slug).includes(normalizedQuery)
    );
  });
}

export function mergeAvailableCategories(
  activeCategories: BookFormCategorySummary[],
  selectedCategories: BookFormCategorySummary[],
): BookFormCategorySummary[] {
  const categoriesById = new Map(activeCategories.map((category) => [category.id, category]));

  for (const category of selectedCategories) {
    categoriesById.set(category.id, category);
  }

  return Array.from(categoriesById.values()).sort((firstCategory, secondCategory) =>
    firstCategory.name.localeCompare(secondCategory.name, 'es'),
  );
}
