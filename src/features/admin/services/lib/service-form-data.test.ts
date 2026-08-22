import { describe, expect, it } from 'vitest';

import type { EditorialService } from '@/db/schema';
import {
  getServiceCreateInput,
  getServiceFormValues,
  getServiceFormValuesFromService,
} from './service-form-data';

const baseService: EditorialService = {
  id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  name: 'Corrección de manuscrito',
  slug: 'correccion-de-manuscrito',
  shortDescription: null,
  description: null,
  isPublished: true,
  isFeatured: false,
  isArchived: false,
  archivedAt: null,
  sortOrder: 2,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('service form data helpers', () => {
  it('extracts text and boolean values from FormData', () => {
    const formData = new FormData();
    formData.set('name', 'Corrección de manuscrito');
    formData.set('slug', '');
    formData.set('shortDescription', 'Resumen');
    formData.set('description', 'Descripción');
    formData.set('isPublished', 'true');
    formData.set('isFeatured', 'true');
    formData.set('sortOrder', '4');

    expect(getServiceFormValues(formData)).toEqual({
      name: 'Corrección de manuscrito',
      slug: '',
      shortDescription: 'Resumen',
      description: 'Descripción',
      isPublished: true,
      isFeatured: true,
      sortOrder: '4',
    });
  });

  it('converts missing switches to false and sort order to number', () => {
    const formData = new FormData();
    formData.set('name', 'Ghostwriting');
    formData.set('slug', 'ghostwriting');
    formData.set('sortOrder', '7');

    expect(getServiceCreateInput(formData)).toMatchObject({
      name: 'Ghostwriting',
      slug: 'ghostwriting',
      isPublished: false,
      isFeatured: false,
      sortOrder: 7,
    });
  });

  it('maps nullable service fields to form strings', () => {
    expect(getServiceFormValuesFromService(baseService)).toEqual({
      name: 'Corrección de manuscrito',
      slug: 'correccion-de-manuscrito',
      shortDescription: '',
      description: '',
      isPublished: true,
      isFeatured: false,
      sortOrder: '2',
    });
  });
});
