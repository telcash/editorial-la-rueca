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
  | 'websiteUrl'
  | 'instagramUrl'
  | 'facebookUrl'
  | 'country'
  | 'sortOrder';

interface AuthorFormDataOptions {
  defaultSortOrder?: number | string;
}

function getTextValue(formData: FormData, field: TextFieldName): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

function getSortOrderValue(formData: FormData, options: AuthorFormDataOptions = {}): string {
  const value = getTextValue(formData, 'sortOrder');

  return value || String(options.defaultSortOrder ?? 0);
}

function getBooleanValue(formData: FormData, field: 'isPublished' | 'isFeatured'): boolean {
  return formData.getAll(field).some((value) => value === 'true' || value === 'on');
}

export function getAuthorFormValues(
  formData: FormData,
  options: AuthorFormDataOptions = {},
): AuthorFormValues {
  return {
    name: getTextValue(formData, 'name'),
    slug: getTextValue(formData, 'slug'),
    shortBio: getTextValue(formData, 'shortBio'),
    biography: getTextValue(formData, 'biography'),
    photoUrl: '',
    websiteUrl: getTextValue(formData, 'websiteUrl'),
    instagramUrl: getTextValue(formData, 'instagramUrl'),
    facebookUrl: getTextValue(formData, 'facebookUrl'),
    country: getTextValue(formData, 'country'),
    isPublished: getBooleanValue(formData, 'isPublished'),
    isFeatured: getBooleanValue(formData, 'isFeatured'),
    sortOrder: getSortOrderValue(formData, options),
  };
}

export function getAuthorPhotoFile(formData: FormData): File | null {
  const photo = formData.get('photo');

  if (!(photo instanceof File) || photo.size === 0) {
    return null;
  }

  return photo;
}

export function getAuthorCreateInput(formData: FormData): AuthorCreateInputFromForm {
  const values = getAuthorFormValues(formData);
  const sortOrder = Number(values.sortOrder);

  return {
    name: values.name,
    slug: values.slug,
    shortBio: values.shortBio,
    biography: values.biography,
    websiteUrl: values.websiteUrl,
    instagramUrl: values.instagramUrl,
    facebookUrl: values.facebookUrl,
    country: values.country,
    isPublished: values.isPublished,
    isFeatured: values.isFeatured,
    sortOrder,
  };
}

export function getAuthorUpdateInput(
  formData: FormData,
  options: AuthorFormDataOptions = {},
): AuthorUpdateInputFromForm {
  const values = getAuthorFormValues(formData, options);
  const sortOrder = Number(values.sortOrder);

  return {
    name: values.name,
    slug: values.slug,
    shortBio: values.shortBio,
    biography: values.biography,
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
