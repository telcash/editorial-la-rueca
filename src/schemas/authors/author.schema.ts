import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeAuthorSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const slugSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeAuthorSlug(value) : value),
  z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres.')
    .max(180, 'El slug no puede superar los 180 caracteres.')
    .regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.'),
);

const optionalTrimmedStringAsNull = (maxLength?: number) => {
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
};

const optionalUrlAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().url('Debe ser una URL valida.').nullable().optional());

const authorInputFields = {
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(160, 'El nombre no puede superar los 160 caracteres.'),
  slug: slugSchema,
  shortBio: optionalTrimmedStringAsNull(500),
  biography: optionalTrimmedStringAsNull(),
  photoUrl: optionalUrlAsNull,
  websiteUrl: optionalUrlAsNull,
  instagramUrl: optionalUrlAsNull,
  facebookUrl: optionalUrlAsNull,
  country: optionalTrimmedStringAsNull(100),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  sortOrder: z
    .number()
    .int('El orden debe ser un numero entero.')
    .min(0, 'El orden no puede ser negativo.'),
};

export const createAuthorSchema = z
  .object({
    ...authorInputFields,
    isFeatured: authorInputFields.isFeatured.default(false),
    isPublished: authorInputFields.isPublished.default(false),
    sortOrder: authorInputFields.sortOrder.default(0),
  })
  .strict();

export const updateAuthorSchema = z
  .object(authorInputFields)
  .strict()
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type UpdateAuthorInput = z.infer<typeof updateAuthorSchema>;
