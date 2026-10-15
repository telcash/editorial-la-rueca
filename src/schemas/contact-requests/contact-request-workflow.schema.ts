import { z } from 'zod';

export const contactRequestStatusClassifications = ['open', 'won', 'lost'] as const;
export const contactRequestStatusKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/, 'Usa una clave interna en snake_case.')
  .refine((key) => key !== 'all', 'La clave all esta reservada para el filtro Todos.');

export const contactRequestStatusClassificationSchema = z.enum(contactRequestStatusClassifications);

export const createContactRequestStatusSchema = z
  .object({
    key: contactRequestStatusKeySchema,
    label: z.string().trim().min(1).max(80),
    classification: contactRequestStatusClassificationSchema,
    sortOrder: z.number().int().min(0).max(10000).default(0),
  })
  .strict();

export const updateContactRequestStatusDefinitionSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    sortOrder: z.number().int().min(0).max(10000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export const createContactRequestNoteSchema = z
  .object({
    contactRequestId: z.string().uuid(),
    body: z.string().trim().min(1).max(10000),
  })
  .strict();

export const transitionContactRequestStatusSchema = z
  .object({
    contactRequestId: z.string().uuid(),
    newStatus: contactRequestStatusKeySchema,
  })
  .strict();

export type ContactRequestStatusClassification =
  (typeof contactRequestStatusClassifications)[number];
export type CreateContactRequestStatusInput = z.infer<typeof createContactRequestStatusSchema>;
export type UpdateContactRequestStatusDefinitionInput = z.infer<
  typeof updateContactRequestStatusDefinitionSchema
>;
export type CreateContactRequestNoteInput = z.infer<typeof createContactRequestNoteSchema>;
export type PersistContactRequestNoteInput = CreateContactRequestNoteInput & {
  authorProfileId: string;
};
export type TransitionContactRequestStatusInput = z.infer<
  typeof transitionContactRequestStatusSchema
>;
