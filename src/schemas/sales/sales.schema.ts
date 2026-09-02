import { z } from 'zod';

import {
  SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER,
  isValidProductUrlTemplate,
} from '@/services/sales/purchase-url-resolver';
import { bookSalesProductStatusValues } from '@/services/sales/sales-product-status';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

const optionalHttpUrlAsNull = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}, z.string().trim().url('Debe ser una URL valida.').nullable().optional());

const requiredHttpUrl = z.string().trim().url('Debe ser una URL valida.');

const optionalHttpPurchaseUrlAsNull = z.preprocess(
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
    .url('La URL de Amazon no es válida.')
    .refine((value) => {
      const protocol = new URL(value).protocol;

      return protocol === 'http:' || protocol === 'https:';
    }, 'La URL de Amazon debe usar http o https.')
    .nullable(),
);

const slugSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z
    .string()
    .min(1, 'El slug debe tener al menos 1 caracter.')
    .max(140, 'El slug no puede superar los 140 caracteres.')
    .regex(slugPattern, 'El slug solo puede contener letras minusculas, numeros y guiones.'),
);

const productUrlTemplateSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  },
  z
    .string()
    .refine(
      (value) => value.includes(SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER),
      `La plantilla debe incluir ${SALES_PRODUCT_EXTERNAL_ID_PLACEHOLDER}.`,
    )
    .refine(isValidProductUrlTemplate, 'La plantilla debe resolver una URL http o https valida.')
    .nullable()
    .optional(),
);

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

export const salesChannelSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'El nombre debe tener al menos 1 caracter.')
      .max(120, 'El nombre no puede superar los 120 caracteres.'),
    slug: slugSchema,
    websiteUrl: optionalHttpUrlAsNull,
    isActive: z.boolean().default(true),
    sortOrder: sortOrderSchema.default(0),
  })
  .strict();

export const salesChannelMarketSchema = z
  .object({
    salesChannelId: z.string().uuid('El canal de venta debe ser un UUID valido.'),
    name: z
      .string()
      .trim()
      .min(1, 'El nombre debe tener al menos 1 caracter.')
      .max(120, 'El nombre no puede superar los 120 caracteres.'),
    countryCode: optionalTrimmedStringAsNull(10),
    baseUrl: requiredHttpUrl,
    productUrlTemplate: productUrlTemplateSchema,
    isActive: z.boolean().default(true),
    sortOrder: sortOrderSchema.default(0),
  })
  .strict();

export const bookSalesProductSchema = z
  .object({
    bookId: z.string().uuid('El libro debe ser un UUID valido.'),
    salesChannelId: z.string().uuid('El canal de venta debe ser un UUID valido.'),
    externalProductId: optionalTrimmedStringAsNull(255),
    purchaseUrl: optionalHttpUrlAsNull,
    status: z.enum(bookSalesProductStatusValues).default('available'),
    isActive: z.boolean().default(true),
    sortOrder: sortOrderSchema.default(0),
  })
  .strict();

export const bookSalesMarketAvailabilitySchema = z
  .object({
    bookSalesProductId: z.string().uuid('El producto comercial debe ser un UUID valido.'),
    salesChannelMarketId: z.string().uuid('El mercado debe ser un UUID valido.'),
  })
  .strict();

const bookSalesChannelConfigurationSchema = z
  .object({
    enabled: z.boolean(),
    status: z.enum(bookSalesProductStatusValues),
  })
  .strict();

const quaresBookSalesConfigurationSchema = bookSalesChannelConfigurationSchema
  .extend({
    externalProductId: optionalTrimmedStringAsNull(255),
    marketIds: z
      .array(z.string().uuid('El mercado seleccionado no es válido.'))
      .transform((marketIds) => Array.from(new Set(marketIds))),
  })
  .superRefine((configuration, context) => {
    if (!configuration.enabled || configuration.status !== 'available') {
      return;
    }

    if (!configuration.externalProductId) {
      context.addIssue({
        code: 'custom',
        path: ['externalProductId'],
        message: 'El ID Quares es obligatorio cuando el producto está disponible.',
      });
    }

    if (configuration.marketIds.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['marketIds'],
        message: 'Selecciona al menos un mercado para Quares.',
      });
    }
  });

const amazonBookSalesConfigurationSchema = bookSalesChannelConfigurationSchema
  .extend({
    purchaseUrl: optionalHttpPurchaseUrlAsNull,
  })
  .superRefine((configuration, context) => {
    if (
      configuration.enabled &&
      configuration.status === 'available' &&
      !configuration.purchaseUrl
    ) {
      context.addIssue({
        code: 'custom',
        path: ['purchaseUrl'],
        message: 'La URL de compra de Amazon es obligatoria cuando el producto está disponible.',
      });
    }
  });

export const updateBookSalesConfigurationSchema = z
  .object({
    quares: quaresBookSalesConfigurationSchema,
    amazon: amazonBookSalesConfigurationSchema,
  })
  .strict();

export type SalesChannelInput = z.infer<typeof salesChannelSchema>;
export type SalesChannelMarketInput = z.infer<typeof salesChannelMarketSchema>;
export type BookSalesProductInput = z.infer<typeof bookSalesProductSchema>;
export type BookSalesMarketAvailabilityInput = z.infer<typeof bookSalesMarketAvailabilitySchema>;
export type UpdateBookSalesConfigurationInput = z.infer<typeof updateBookSalesConfigurationSchema>;
