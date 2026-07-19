import type { Category } from '@/db/schema';
import type {
  CategoryCreateInputFromForm,
  CategoryFormValues,
  CategoryUpdateInputFromForm,
} from '../types/category-form-state';

function getTextValue(formData: FormData, field: 'name' | 'slug' | 'description'): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

function getBooleanValue(formData: FormData, field: 'isPublished'): boolean {
  return formData.getAll(field).some((value) => value === 'true' || value === 'on');
}

export function getCategoryFormValues(formData: FormData): CategoryFormValues {
  return {
    name: getTextValue(formData, 'name'),
    slug: getTextValue(formData, 'slug'),
    description: getTextValue(formData, 'description'),
    isPublished: getBooleanValue(formData, 'isPublished'),
  };
}

export function getCategoryCreateInput(formData: FormData): CategoryCreateInputFromForm {
  const values = getCategoryFormValues(formData);

  return {
    name: values.name,
    slug: values.slug,
    description: values.description,
    isPublished: values.isPublished,
  };
}

export function getCategoryUpdateInput(formData: FormData): CategoryUpdateInputFromForm {
  return getCategoryCreateInput(formData);
}

export function getCategoryFormValuesFromCategory(category: Category): CategoryFormValues {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    isPublished: category.isPublished,
  };
}
