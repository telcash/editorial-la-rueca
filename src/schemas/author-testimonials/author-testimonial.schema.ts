import { z } from 'zod';

const optionalTextAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().nullable().optional());

const optionalUuidAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().uuid('El id debe ser un UUID válido.').nullable().optional());

const optionalRating = z
  .number()
  .int('La valoración debe ser un número entero.')
  .min(1, 'La valoración mínima es 1.')
  .max(5, 'La valoración máxima es 5.')
  .nullable()
  .optional();

const testimonialInputFields = {
  authorId: z.string().uuid('Debes seleccionar un autor válido.'),
  bookId: optionalUuidAsNull,
  quote: z.string().trim().min(10, 'El testimonio debe tener al menos 10 caracteres.'),
  source: optionalTextAsNull,
  rating: optionalRating,
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int('El orden debe ser un número entero.'),
};

export const createAuthorTestimonialSchema = z
  .object({
    ...testimonialInputFields,
    bookId: testimonialInputFields.bookId.default(null),
    source: testimonialInputFields.source.default(null),
    rating: testimonialInputFields.rating.default(null),
    isPublished: testimonialInputFields.isPublished.default(false),
    isFeatured: testimonialInputFields.isFeatured.default(false),
    sortOrder: testimonialInputFields.sortOrder.default(0),
  })
  .strict();

export const updateAuthorTestimonialSchema = z
  .object(testimonialInputFields)
  .strict()
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type CreateAuthorTestimonialInput = z.infer<typeof createAuthorTestimonialSchema>;
export type UpdateAuthorTestimonialInput = z.infer<typeof updateAuthorTestimonialSchema>;
