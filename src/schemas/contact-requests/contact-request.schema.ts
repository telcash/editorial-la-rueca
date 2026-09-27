import { z } from 'zod';

import { contactRequestUtmLimits } from './utm';

export const contactRequestStatuses = ['new', 'contacted', 'in_progress', 'won', 'lost'] as const;
export const contactRequestSources = [
  'website',
  'instagram',
  'facebook',
  'direct',
  'other',
  'meta_instant_form',
] as const;

export const contactRequestStatusSchema = z.enum(contactRequestStatuses);
export const contactRequestSourceSchema = z.enum(contactRequestSources);

const optionalTrimmedStringAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().nullable().optional());

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().max(80).nullable().optional(),
);

const optionalProvinceSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().max(120).nullable().optional(),
);

const optionalUtmSchema = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') {
        return value;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length === 0 ? null : trimmedValue;
    },
    z
      .string()
      .trim()
      .max(maxLength, `El valor UTM no puede superar los ${maxLength} caracteres.`)
      .nullable()
      .optional(),
  );

const phonePattern = /^[0-9+()\-\s.]{6,40}$/;

export const createContactRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre es obligatorio.')
      .max(160, 'El nombre no puede superar los 160 caracteres.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Introduce un email válido.')
      .max(254, 'El email no puede superar los 254 caracteres.'),
    phone: optionalPhoneSchema,
    province: optionalProvinceSchema,
    serviceId: z.string().uuid('Selecciona un servicio válido.').nullable().optional(),
    message: z
      .string()
      .trim()
      .min(1, 'El mensaje es obligatorio.')
      .max(5000, 'El mensaje no puede superar los 5000 caracteres.'),
    source: contactRequestSourceSchema.default('website'),
    utmSource: optionalUtmSchema(contactRequestUtmLimits.utmSource),
    utmMedium: optionalUtmSchema(contactRequestUtmLimits.utmMedium),
    utmCampaign: optionalUtmSchema(contactRequestUtmLimits.utmCampaign),
    utmContent: optionalUtmSchema(contactRequestUtmLimits.utmContent),
    utmTerm: optionalUtmSchema(contactRequestUtmLimits.utmTerm),
    metaLeadId: z.string().trim().min(1).max(128).nullable().optional(),
    metaFormId: z.string().trim().min(1).max(128).nullable().optional(),
    metaFormName: z.string().trim().min(1).max(255).nullable().optional(),
  })
  .strict();

export const updateContactRequestAdminSchema = z
  .object({
    status: contactRequestStatusSchema.optional(),
    serviceId: z.preprocess(
      (value) => (value === '' ? null : value),
      z.string().uuid('Selecciona un servicio válido.').nullable().optional(),
    ),
    internalNotes: optionalTrimmedStringAsNull,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debes proporcionar al menos un campo para actualizar.',
  });

export type ContactRequestStatus = (typeof contactRequestStatuses)[number];
export type ContactRequestSource = (typeof contactRequestSources)[number];
export type CreateContactRequestInput = z.infer<typeof createContactRequestSchema>;
export type UpdateContactRequestAdminInput = z.infer<typeof updateContactRequestAdminSchema>;

export const publicContactPhoneSchema = z
  .string()
  .trim()
  .min(1, 'El teléfono es obligatorio.')
  .max(80, 'El teléfono no puede superar los 80 caracteres.')
  .regex(phonePattern, 'Introduce un teléfono válido.');

export const publicContactProvinceSchema = z
  .string()
  .trim()
  .min(1, 'La provincia es obligatoria.')
  .max(120, 'La provincia no puede superar los 120 caracteres.');

export const publicContactServiceIdSchema = z.string().uuid('Selecciona un servicio válido.');

export const publicContactMessageSchema = z
  .string()
  .trim()
  .min(10, 'El mensaje debe tener al menos 10 caracteres.')
  .max(5000, 'El mensaje no puede superar los 5000 caracteres.');
