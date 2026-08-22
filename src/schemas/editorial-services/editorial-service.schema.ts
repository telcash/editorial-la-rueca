import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeServiceSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/ñ/g, 'n')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const optionalTrimmedStringAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().nullable().optional());

const optionalShortDescriptionSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().max(500, 'La descripción corta no puede superar los 500 caracteres.').nullable().optional());

const optionalSlugSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedSlug = normalizeServiceSlug(value);

  return normalizedSlug.length > 0 ? normalizedSlug : undefined;
}, z.string().min(2, 'El slug debe tener al menos 2 caracteres.').max(180, 'El slug no puede superar los 180 caracteres.').regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.').optional());

export const serviceSlugSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeServiceSlug(value) : value),
  z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres.')
    .max(180, 'El slug no puede superar los 180 caracteres.')
    .regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.'),
);

const serviceInputFields = {
  name: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio.')
    .max(160, 'El nombre no puede superar los 160 caracteres.'),
  slug: optionalSlugSchema,
  shortDescription: optionalShortDescriptionSchema,
  description: optionalTrimmedStringAsNull,
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int('El orden debe ser un número entero.'),
};

export const createServiceSchema = z
  .object({
    ...serviceInputFields,
    isPublished: serviceInputFields.isPublished.default(false),
    isFeatured: serviceInputFields.isFeatured.default(false),
    sortOrder: serviceInputFields.sortOrder.default(0),
  })
  .strict()
  .transform((data) => ({
    ...data,
    slug: data.slug ?? normalizeServiceSlug(data.name),
  }))
  .refine((data) => data.slug.length >= 2, {
    path: ['slug'],
    message: 'El slug debe tener al menos 2 caracteres.',
  });

export const updateServiceSchema = z
  .object(serviceInputFields)
  .strict()
  .partial()
  .transform((data) => {
    const nextData = { ...data };

    if (nextData.slug === undefined) {
      delete nextData.slug;
    }

    return nextData;
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
