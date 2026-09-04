'use server';

import { passwordResetRequestSchema } from '@/schemas/auth/password.schema';
import { createClient } from '@/lib/supabase/server';
import { getPasswordResetRedirectUrl } from '@/features/auth/lib/password-reset-url';
import type { PasswordResetRequestState } from '../types/password-action-state';

export async function requestPasswordReset(
  _previousState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const values = {
    email: typeof formData.get('email') === 'string' ? String(formData.get('email')) : '',
  };
  const parsedInput = passwordResetRequestSchema.safeParse(values);

  if (!parsedInput.success) {
    return {
      success: false,
      fieldErrors: parsedInput.error.flatten().fieldErrors,
      formError: null,
      values,
    };
  }

  let redirectTo: string;

  try {
    redirectTo = getPasswordResetRedirectUrl();
  } catch {
    return {
      success: false,
      fieldErrors: {},
      formError: 'No se pudo solicitar el enlace. Inténtalo de nuevo más tarde.',
      values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsedInput.data.email, {
    redirectTo,
  });

  if (error && process.env.NODE_ENV === 'development') {
    console.error('[Auth] Password reset request failed', {
      status: error.status,
      message: error.message,
    });
  }

  return {
    success: true,
    fieldErrors: {},
    formError: null,
    values: {
      email: '',
    },
  };
}
