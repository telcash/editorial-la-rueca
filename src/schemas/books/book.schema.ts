import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const isbn10Pattern = /^\d{9}[\dX]$/;
const isbn13Pattern = /^\d{13}$/;
const pricePattern = /^\d+(?:\.\d{1,2})?$/;

export const bookFormatValues = ['paperback', 'hardcover', 'ebook', 'audiobook'] as const;
const currencyValues = ['EUR', 'USD', 'GBP'] as const;

export function normalizeBookSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeIsbn10(value: string): string {
  const normalizedValue = value.replace(/[\s-]+/g, '').toUpperCase();

  return normalizedValue.slice(0, 9) + normalizedValue.slice(9).replace(/X/g, 'X');
}

export function normalizeIsbn13(value: string): string {
  return value.replace(/[\s-]+/g, '');
}

export function isValidIsbn10(value: string): boolean {
  if (!isbn10Pattern.test(value)) {
    return false;
  }

  const sum = value.split('').reduce((total, character, index) => {
    const digit = character === 'X' ? 10 : Number(character);

    return total + digit * (10 - index);
  }, 0);

  return sum % 11 === 0;
}

export function isValidIsbn13(value: string): boolean {
  if (!isbn13Pattern.test(value)) {
    return false;
  }

  const sum = value.split('').reduce((total, character, index) => {
    const digit = Number(character);

    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return sum % 10 === 0;
}

function isValidDateString(value: string): boolean {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function optionalTrimmedStringAsNull(maxLength?: number) {
  const schema = maxLength
    ? z.string().trim().max(maxLength, `El texto no puede superar los ${maxLength} caracteres.`)
    : z.string().trim();

  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  }, schema.nullable().optional());
}

const optionalUrlAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().url('Debe ser una URL valida.').nullable().optional());

const optionalDateAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().refine(isValidDateString, 'Debe ser una fecha valida.').nullable().optional());

const slugSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeBookSlug(value) : value),
  z
    .string()
    .min(1, 'El slug debe tener al menos 1 caracter.')
    .max(220, 'El slug no puede superar los 220 caracteres.')
    .regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.'),
);

const languageSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim().toLowerCase();

    return trimmedValue.length === 0 ? null : trimmedValue;
  },
  z
    .string()
    .regex(/^[a-z]{2,3}$/, 'El idioma debe ser un codigo de dos o tres letras.')
    .nullable()
    .optional(),
);

const isbn10Schema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = normalizeIsbn10(value);

  return normalizedValue.length === 0 ? null : normalizedValue;
}, z.string().refine(isValidIsbn10, 'El ISBN-10 no es valido.').nullable().optional());

const isbn13Schema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = normalizeIsbn13(value);

  return normalizedValue.length === 0 ? null : normalizedValue;
}, z.string().refine(isValidIsbn13, 'El ISBN-13 no es valido.').nullable().optional());

const priceSchema = z.preprocess((value) => {
  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim().replace(',', '.');

  return normalizedValue.length === 0 ? null : normalizedValue;
}, z.string().regex(pricePattern, 'El precio debe tener maximo dos decimales.').nullable().optional());

const pagesSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : Number(trimmedValue);
  }

  return value;
}, z.number().int('Las paginas deben ser un numero entero.').positive('Las paginas deben ser mayores que cero.').nullable().optional());

const sortOrderSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();

      return trimmedValue.length === 0 ? 0 : Number(trimmedValue);
    }

    return value;
  },
  z.number().int('El orden debe ser un numero entero.').min(0, 'El orden no puede ser negativo.'),
);

const bookInputFields = {
  title: z
    .string()
    .trim()
    .min(1, 'El titulo debe tener al menos 1 caracter.')
    .max(220, 'El titulo no puede superar los 220 caracteres.'),
  subtitle: optionalTrimmedStringAsNull(220),
  slug: slugSchema,
  description: optionalTrimmedStringAsNull(),
  excerpt: optionalTrimmedStringAsNull(),
  coverUrl: optionalUrlAsNull,
  originalPublicationDate: optionalDateAsNull,
  language: languageSchema,
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: sortOrderSchema,
  metaTitle: optionalTrimmedStringAsNull(160),
  metaDescription: optionalTrimmedStringAsNull(300),
  canonicalUrl: optionalUrlAsNull,
};

const editionInputFields = {
  id: z.string().uuid('El id de la edicion debe ser un UUID valido.').optional(),
  format: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
    z.enum(bookFormatValues),
  ),
  editionLabel: optionalTrimmedStringAsNull(120),
  publicationDate: optionalDateAsNull,
  isbn10: isbn10Schema,
  isbn13: isbn13Schema,
  price: priceSchema,
  currency: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim().toUpperCase() : value),
    z.enum(currencyValues).default('EUR'),
  ),
  pages: pagesSchema,
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: sortOrderSchema.default(0),
};

export const bookEditionInputSchema = z.object(editionInputFields).strict();

const authorIdsSchema = z
  .array(z.string().uuid('El id del autor debe ser un UUID valido.'))
  .min(1, 'Debes seleccionar al menos un autor.')
  .refine((authorIds) => new Set(authorIds).size === authorIds.length, {
    message: 'No puedes repetir autores en el mismo libro.',
  });

const categoryIdsSchema = z.array(
  z.string().uuid('El id de la categoría debe ser un UUID valido.'),
);

const editionsSchema = z
  .array(bookEditionInputSchema)
  .min(1, 'Debes agregar al menos una edicion.')
  .superRefine((editions, context) => {
    const seenIsbn10 = new Set<string>();
    const seenIsbn13 = new Set<string>();

    editions.forEach((edition, index) => {
      if (edition.isbn10) {
        if (seenIsbn10.has(edition.isbn10)) {
          context.addIssue({
            code: 'custom',
            message: 'No puedes repetir ISBN-10 entre ediciones.',
            path: [index, 'isbn10'],
          });
        }

        seenIsbn10.add(edition.isbn10);
      }

      if (edition.isbn13) {
        if (seenIsbn13.has(edition.isbn13)) {
          context.addIssue({
            code: 'custom',
            message: 'No puedes repetir ISBN-13 entre ediciones.',
            path: [index, 'isbn13'],
          });
        }

        seenIsbn13.add(edition.isbn13);
      }
    });
  });

export const createBookSchema = z
  .object({
    ...bookInputFields,
    isFeatured: bookInputFields.isFeatured.default(false),
    isPublished: bookInputFields.isPublished.default(false),
    sortOrder: bookInputFields.sortOrder.default(0),
    authorIds: authorIdsSchema,
    categoryIds: categoryIdsSchema.default([]),
    editions: editionsSchema,
  })
  .strict();

export const updateBookSchema = z
  .object({
    ...bookInputFields,
    authorIds: authorIdsSchema.optional(),
    categoryIds: categoryIdsSchema.optional(),
    editions: editionsSchema.optional(),
  })
  .strict()
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type BookEditionInput = z.infer<typeof bookEditionInputSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
