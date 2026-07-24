'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { updatePasswordSchema } from '@/schemas/auth/password.schema';
import { createClient } from '@/lib/supabase/server';
import type { UpdatePasswordState } from '../types/password-action-state';

interface UpdatePasswordOptions {
  redirectTo: string;
}

export async function updatePassword(
  options: UpdatePasswordOptions,
  _previousState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsedInput = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsedInput.data.password,
  });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Password update failed', {
        status: error.status,
        message: error.message,
      });
    }

    return {
      success: false,
      fieldErrors: {},
      formError:
        'No se pudo actualizar la contraseña. Solicita un nuevo enlace e inténtalo de nuevo.',
    };
  }

  revalidatePath('/admin');
  redirect(options.redirectTo);
}
