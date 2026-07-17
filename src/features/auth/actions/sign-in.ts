'use server';

import { redirect } from 'next/navigation';

import { signInSchema } from '@/schemas/auth/sign-in.schema';
import { createClient } from '@/lib/supabase/server';
import type { SignInState } from '@/features/auth/types/sign-in-state';

export async function signIn(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const validatedInput = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedInput.success) {
    return {
      success: false,
      fieldErrors: validatedInput.error.flatten().fieldErrors,
      formError: null,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(validatedInput.data);

  if (error) {
    return {
      success: false,
      fieldErrors: {},
      formError: 'No hemos podido iniciar sesion con esas credenciales.',
    };
  }

  redirect('/admin');
}
