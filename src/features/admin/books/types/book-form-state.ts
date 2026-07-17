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
