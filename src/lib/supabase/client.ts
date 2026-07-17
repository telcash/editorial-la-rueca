import { createBrowserClient } from '@supabase/ssr';

import { getSupabasePublicConfig } from './env';

export function createClient() {
  const { supabaseUrl, supabaseKey } = getSupabasePublicConfig();

  return createBrowserClient(supabaseUrl, supabaseKey);
}
