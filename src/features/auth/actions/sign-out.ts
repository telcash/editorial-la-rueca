'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Sign out failed', {
        status: error.status,
        message: error.message,
      });
    }

    return;
  }

  redirect('/login');
}
