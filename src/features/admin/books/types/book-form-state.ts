export interface BookGeneralFormValues {
  title: string;
  subtitle: string;
  slug: string;
  description: string;
  excerpt: string;
  originalPublicationDate: string;
  language: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
}

export type BookGeneralFormField = keyof BookGeneralFormValues;

export type BookGeneralFormErrors = Partial<Record<BookGeneralFormField, string>>;
export type BookGeneralFormTouched = Partial<Record<BookGeneralFormField, boolean>>;

export interface BookFormAuthorSummary {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
}

export interface BookEditionFormValues {
  clientId: string;
  format: string;
  editionLabel: string;
  publicationDate: string;
  isbn10: string;
  isbn13: string;
  price: string;
  currency: string;
  pages: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: string;
}

export type BookEditionFormField = keyof Omit<BookEditionFormValues, 'clientId'>;
export type BookEditionFormErrors = Partial<Record<BookEditionFormField, string>>;
export type BookEditionFormTouched = Partial<Record<BookEditionFormField, boolean>>;
export type BookEditionFormTouchedById = Record<string, BookEditionFormTouched>;
export type BookEditionFormErrorsById = Record<string, BookEditionFormErrors>;

export interface BookFormInitialValues {
  general: BookGeneralFormValues;
  selectedAuthors: BookFormAuthorSummary[];
  editions: BookEditionFormValues[];
  coverUrl: string;
}

export const initialBookGeneralFormValues: BookGeneralFormValues = {
  title: '',
  subtitle: '',
  slug: '',
  description: '',
  excerpt: '',
  originalPublicationDate: '',
  language: '',
  isPublished: false,
  isFeatured: false,
  sortOrder: '0',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
};
