import { describe, expect, it } from 'vitest';

import type { BookEditionDetails, BookWithDetails } from '@/services/books/book.types';
import {
  getBookDetailSummary,
  getBookEditorialFactItems,
  getBookSynopsis,
  getEditionAvailabilityLabel,
  getLanguageLabel,
  getPrimaryEditionMetaItems,
  isRecentBookEdition,
  selectPrimaryBookEdition,
} from './book-edition.helpers';

const baseEdition: BookEditionDetails = {
  id: 'a301b33b-aa0d-470f-a6cc-60f0b9dcacbf',
  bookId: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  format: 'paperback',
  editionLabel: '2.ª edición',
  publicationDate: '2025-01-01',
  isbn10: null,
  isbn13: '9788412345678',
  price: '18.50',
  currency: 'EUR',
  pages: 180,
  isAvailable: true,
  isFeatured: false,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const book: BookWithDetails = {
  id: '6b34dbd8-6d3c-41db-86b7-c83f3de68d75',
  title: 'Cruce de Pasos',
  subtitle: 'Una novela de memoria',
  slug: 'cruce-de-pasos',
  description: '<p>Primera línea.</p><p>Segunda línea con detalle editorial.</p>',
  excerpt: 'Resumen breve',
  coverUrl: 'https://example.com/cover.jpg',
  originalPublicationDate: '2020-01-01',
  language: 'es',
  isFeatured: true,
  isPublished: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  authors: [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Ana Autora',
      slug: 'ana-autora',
      photoUrl: null,
      isArchived: false,
      sortOrder: 0,
    },
  ],
  categories: [
    {
      id: 'b6c01145-e237-4f1f-acb9-a60067a167d4',
      name: 'Narrativa',
      slug: 'narrativa',
      isArchived: false,
      sortOrder: 0,
    },
  ],
  editions: [baseEdition],
};

describe('book edition helpers', () => {
  it('keeps primary edition selection deterministic with original order as final fallback', () => {
    const firstEdition = { ...baseEdition, id: '11ecb0f8-1d46-44f0-a9b7-b46d122ec60f' };
    const secondEdition = { ...baseEdition, id: 'd86efcf9-7d67-4b6c-96cb-99b61750e6cc' };

    expect(selectPrimaryBookEdition([firstEdition, secondEdition])).toBe(firstEdition);
  });

  it('formats availability without promising stock', () => {
    expect(getEditionAvailabilityLabel(baseEdition)).toBe('Disponible');
    expect(getEditionAvailabilityLabel({ ...baseEdition, isAvailable: false })).toBe(
      'Consultar disponibilidad',
    );
  });

  it('maps common language codes and preserves readable values', () => {
    expect(getLanguageLabel('es')).toBe('Español');
    expect(getLanguageLabel('gl')).toBe('Gallego');
    expect(getLanguageLabel('ast')).toBe('Asturiano');
    expect(getLanguageLabel('la')).toBe('Latín');
    expect(getLanguageLabel('en')).toBe('Inglés');
    expect(getLanguageLabel('fr')).toBe('Francés');
    expect(getLanguageLabel('Italiano')).toBe('Italiano');
    expect(getLanguageLabel('')).toBeNull();
  });

  it('detects novedades from primary edition publication date within eighteen months', () => {
    expect(isRecentBookEdition(baseEdition, new Date('2026-06-01T00:00:00.000Z'))).toBe(true);
    expect(isRecentBookEdition(baseEdition, new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
    expect(isRecentBookEdition(null)).toBe(false);
  });

  it('builds a brief hero summary and keeps the full synopsis separate', () => {
    expect(getBookDetailSummary(book)).toBe('Resumen breve');
    expect(getBookSynopsis({ ...book, excerpt: null })).toBe(
      'Primera línea.\n\nSegunda línea con detalle editorial.',
    );
  });

  it('builds visible hero metadata from the primary edition', () => {
    expect(getPrimaryEditionMetaItems(book, baseEdition)).toEqual([
      { label: 'Año', value: '2025' },
      { label: 'Formato', value: 'Rústica' },
      { label: 'Páginas', value: '180' },
      { label: 'Idioma', value: 'Español' },
      { label: 'ISBN', value: '9788412345678' },
      { label: 'Disponibilidad', value: 'Disponible' },
    ]);
  });

  it('omits missing values from the editorial facts', () => {
    expect(getBookEditorialFactItems(book, baseEdition)).toContainEqual({
      label: 'Autoría',
      value: 'Ana Autora',
    });
    expect(
      getBookEditorialFactItems({ ...book, subtitle: null, categories: [] }, baseEdition),
    ).not.toContainEqual({
      label: 'Subtítulo',
      value: '',
    });
  });
});
