import { describe, expect, it } from 'vitest';

import { initialBookGeneralFormValues } from '../types/book-form-state';
import {
  areBookGeneralValuesDirty,
  resetSlugFromTitle,
  slugifyBookTitle,
  updateValuesFromManualSlug,
  updateValuesFromTitle,
  validateBookGeneralForm,
} from './book-form.helpers';

describe('slugifyBookTitle', () => {
  it('normalizes common editorial titles', () => {
    expect(slugifyBookTitle('El jardín perdido')).toBe('el-jardin-perdido');
    expect(slugifyBookTitle('NIÑO Y LUNA')).toBe('nino-y-luna');
    expect(slugifyBookTitle('¿Qué pasó aquí?')).toBe('que-paso-aqui');
    expect(slugifyBookTitle('  Una   historia  ')).toBe('una-historia');
    expect(slugifyBookTitle('---Libro---')).toBe('libro');
    expect(slugifyBookTitle('###')).toBe('');
    expect(slugifyBookTitle('Libro---nuevo')).toBe('libro-nuevo');
  });
});

describe('book slug state helpers', () => {
  it('generates and updates automatic slug from title', () => {
    const values = updateValuesFromTitle(initialBookGeneralFormValues, 'El jardín perdido', false);

    expect(values.slug).toBe('el-jardin-perdido');
    expect(updateValuesFromTitle(values, 'Una historia', false).slug).toBe('una-historia');
  });

  it('keeps manual slug when title changes', () => {
    const automaticValues = updateValuesFromTitle(
      initialBookGeneralFormValues,
      'El jardín perdido',
      false,
    );
    const manualValues = updateValuesFromManualSlug(automaticValues, 'slug-propio');

    expect(updateValuesFromTitle(manualValues, 'Otro título', true).slug).toBe('slug-propio');
    expect(updateValuesFromTitle({ ...manualValues, slug: '' }, 'Otro título', true).slug).toBe('');
  });

  it('resets slug from title and supports empty titles', () => {
    expect(resetSlugFromTitle({ ...initialBookGeneralFormValues, title: 'Niño & Luna' }).slug).toBe(
      'nino-luna',
    );
    expect(resetSlugFromTitle(initialBookGeneralFormValues).slug).toBe('');
  });
});

describe('bookGeneralFormSchema adaptation', () => {
  it('validates required title, slug, URL, language and sort order', () => {
    expect(validateBookGeneralForm(initialBookGeneralFormValues).title).toBeDefined();
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: ' Libro ',
        slug: 'libro',
        canonicalUrl: 'not-a-url',
      }).canonicalUrl,
    ).toBeDefined();
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: 'Libro',
        slug: '!!!',
      }).slug,
    ).toBeDefined();
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: 'Libro',
        slug: 'libro',
        language: 'es',
      }).language,
    ).toBeUndefined();
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: 'Libro',
        slug: 'libro',
        language: '',
      }).language,
    ).toBeUndefined();
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: 'Libro',
        slug: 'libro',
        sortOrder: '1.5',
      }).sortOrder,
    ).toBeDefined();
  });

  it('allows empty optional text and date fields', () => {
    expect(
      validateBookGeneralForm({
        ...initialBookGeneralFormValues,
        title: 'Libro',
        slug: 'libro',
        subtitle: '',
        description: '',
        excerpt: '',
        originalPublicationDate: '',
        metaTitle: '',
        metaDescription: '',
      }),
    ).toEqual({});
  });

  it('detects dirty values', () => {
    expect(
      areBookGeneralValuesDirty(initialBookGeneralFormValues, initialBookGeneralFormValues),
    ).toBe(false);
    expect(
      areBookGeneralValuesDirty(
        { ...initialBookGeneralFormValues, title: 'Libro' },
        initialBookGeneralFormValues,
      ),
    ).toBe(true);
  });
});
