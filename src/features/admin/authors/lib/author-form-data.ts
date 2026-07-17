import type { Author } from '@/db/schema';
import type {
  AuthorCreateInputFromForm,
  AuthorFormValues,
  AuthorUpdateInputFromForm,
} from '../types/author-form-state';

type TextFieldName =
  | 'name'
  | 'slug'
  | 'shortBio'
  | 'biography'
  | 'photoUrl'
  | 'websiteUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'country'
  | 'sortOrder';

function getTextValue(formData: FormData, field: TextFieldName): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

function getBooleanValue(formData: FormData, field: 'isPublished' | 'isFeatured'): boolean {
  return formData.getAll(field).some((value) => value === 'true' || value === 'on');
}

export function getAuthorFormValues(formData: FormData): AuthorFormValues {
  return {
    name: getTextValue(formData, 'name'),
    slug: getTextValue(formData, 'slug'),
    shortBio: getTextValue(formData, 'shortBio'),
    biography: getTextValue(formData, 'biography'),
    photoUrl: getTextValue(formData, 'photoUrl'),
    websiteUrl: getTextValue(formData, 'websiteUrl'),
    instagramUrl: getTextValue(formData, 'instagramUrl'),
    facebookUrl: getTextValue(formData, 'facebookUrl'),
    country: getTextValue(formData, 'country'),
    isPublished: getBooleanValue(formData, 'isPublished'),
    isFeatured: getBooleanValue(formData, 'isFeatured'),
    sortOrder: getTextValue(formData, 'sortOrder') || '0',
  };
}

export function getAuthorCreateInput(formData: FormData): AuthorCreateInputFromForm {
  const values = getAuthorFormValues(formData);
  const sortOrder = Number(values.sortOrder);

  return {
    name: values.name,
    slug: values.slug,
    shortBio: values.shortBio,
    biography: values.biography,
    photoUrl: values.photoUrl,
    websiteUrl: values.websiteUrl,
    instagramUrl: values.instagramUrl,
    facebookUrl: values.facebookUrl,
    country: values.country,
    isPublished: values.isPublished,
    isFeatured: values.isFeatured,
    sortOrder,
  };
}

export function getAuthorUpdateInput(formData: FormData): AuthorUpdateInputFromForm {
  const values = getAuthorFormValues(formData);
  const sortOrder = Number(values.sortOrder);

  return {
    name: values.name,
    slug: values.slug,
    shortBio: values.shortBio,
    biography: values.biography,
    photoUrl: values.photoUrl,
    websiteUrl: values.websiteUrl,
    instagramUrl: values.instagramUrl,
    facebookUrl: values.facebookUrl,
    country: values.country,
    isPublished: values.isPublished,
    isFeatured: values.isFeatured,
    sortOrder,
  };
}

export function getAuthorFormValuesFromAuthor(author: Author): AuthorFormValues {
  return {
    name: author.name,
    slug: author.slug,
    shortBio: author.shortBio ?? '',
    biography: author.biography ?? '',
    photoUrl: author.photoUrl ?? '',
    websiteUrl: author.websiteUrl ?? '',
    instagramUrl: author.instagramUrl ?? '',
    facebookUrl: author.facebookUrl ?? '',
    country: author.country ?? '',
    isPublished: author.isPublished,
    isFeatured: author.isFeatured,
    sortOrder: String(author.sortOrder),
  };
}
