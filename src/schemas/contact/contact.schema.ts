import { z } from 'zod';

const phoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .string()
    .trim()
    .min(7, 'El teléfono debe tener al menos 7 caracteres.')
    .max(30, 'El teléfono no puede superar los 30 caracteres.')
    .regex(/^[+()\d\s.-]+$/, 'El teléfono contiene caracteres no válidos.')
    .nullable()
    .optional(),
);

export const publicContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  email: z.string().trim().email('Introduce un email válido.'),
  phone: phoneSchema,
  message: z
    .string()
    .trim()
    .min(20, 'Cuéntanos un poco más sobre tu libro.')
    .max(2000, 'El mensaje no puede superar los 2000 caracteres.'),
  privacyAccepted: z.literal(true, {
    error: 'Debes aceptar la política de privacidad.',
  }),
});

export type PublicContactInput = z.infer<typeof publicContactSchema>;
