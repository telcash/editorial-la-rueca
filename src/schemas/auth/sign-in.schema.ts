import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().email('Introduce un correo valido.'),
  password: z.string().min(1, 'Introduce la contrasena.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
