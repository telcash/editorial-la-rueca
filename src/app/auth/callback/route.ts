import { NextResponse, type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/admin';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error && process.env.NODE_ENV === 'development') {
      console.error('[Auth] Code exchange failed', {
        status: error.status,
        message: error.message,
      });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
