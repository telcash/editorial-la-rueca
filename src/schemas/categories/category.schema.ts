import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeCategorySlug(value: string): string {
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

const slugSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalizeCategorySlug(value) : value),
  z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres.')
    .max(180, 'El slug no puede superar los 180 caracteres.')
    .regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.'),
);

const optionalTrimmedStringAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().nullable().optional());

const categoryInputFields = {
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(160, 'El nombre no puede superar los 160 caracteres.'),
  slug: slugSchema,
  description: optionalTrimmedStringAsNull,
  isPublished: z.boolean(),
};

export const createCategorySchema = z
  .object({
    ...categoryInputFields,
    isPublished: categoryInputFields.isPublished.default(false),
  })
  .strict();

export const updateCategorySchema = z
  .object(categoryInputFields)
  .strict()
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
