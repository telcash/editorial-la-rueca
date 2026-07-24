import { z } from 'zod';

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Introduce un correo electrónico válido.'),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirma la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
