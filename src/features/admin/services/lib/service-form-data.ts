import type { EditorialService } from '@/db/schema';
import type {
  ServiceCreateInputFromForm,
  ServiceFormValues,
  ServiceUpdateInputFromForm,
} from '../types/service-form-state';

type TextField = 'name' | 'slug' | 'shortDescription' | 'description' | 'sortOrder';
type BooleanField = 'isPublished' | 'isFeatured';

function getTextValue(formData: FormData, field: TextField): string {
  const value = formData.get(field);

  return typeof value === 'string' ? value : '';
}

function getBooleanValue(formData: FormData, field: BooleanField): boolean {
  return formData.getAll(field).some((value) => value === 'true' || value === 'on');
}

export function getServiceFormValues(formData: FormData): ServiceFormValues {
  return {
    name: getTextValue(formData, 'name'),
    slug: getTextValue(formData, 'slug'),
    shortDescription: getTextValue(formData, 'shortDescription'),
    description: getTextValue(formData, 'description'),
    isPublished: getBooleanValue(formData, 'isPublished'),
    isFeatured: getBooleanValue(formData, 'isFeatured'),
    sortOrder: getTextValue(formData, 'sortOrder'),
  };
}

export function getServiceCreateInput(formData: FormData): ServiceCreateInputFromForm {
  const values = getServiceFormValues(formData);

  return {
    name: values.name,
    slug: values.slug,
    shortDescription: values.shortDescription,
    description: values.description,
    isPublished: values.isPublished,
    isFeatured: values.isFeatured,
    sortOrder: Number(values.sortOrder || 0),
  };
}

export function getServiceUpdateInput(formData: FormData): ServiceUpdateInputFromForm {
  return getServiceCreateInput(formData);
}

export function getServiceFormValuesFromService(service: EditorialService): ServiceFormValues {
  return {
    name: service.name,
    slug: service.slug,
    shortDescription: service.shortDescription ?? '',
    description: service.description ?? '',
    isPublished: service.isPublished,
    isFeatured: service.isFeatured,
    sortOrder: String(service.sortOrder),
  };
}
