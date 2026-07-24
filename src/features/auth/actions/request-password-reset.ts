'use server';

import { headers } from 'next/headers';

import { passwordResetRequestSchema } from '@/schemas/auth/password.schema';
import { createClient } from '@/lib/supabase/server';
import type { PasswordResetRequestState } from '../types/password-action-state';

function getPasswordResetRedirectUrl(origin: string) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', '/login/update-password');

  return url.toString();
}

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

  const headerStore = await headers();
  const origin = headerStore.get('origin') ?? 'http://localhost:3000';
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsedInput.data.email, {
    redirectTo: getPasswordResetRedirectUrl(origin),
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
