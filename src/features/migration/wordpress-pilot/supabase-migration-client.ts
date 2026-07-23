import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseMigrationClientEnv = Record<string, string | undefined>;

export interface SupabaseMigrationClientConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  options: {
    auth: {
      persistSession: false;
      autoRefreshToken: false;
      detectSessionInUrl: false;
    };
  };
}

export function getSupabaseMigrationClientConfig(
  env: SupabaseMigrationClientEnv = process.env,
): SupabaseMigrationClientConfig {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: string[] = [];

  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!serviceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Faltan variables de entorno para Storage de migración: ${missing.join(', ')}.`,
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    options: {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  };
}

export function createSupabaseMigrationClient(): SupabaseClient {
  const config = getSupabaseMigrationClientConfig();

  return createClient(config.supabaseUrl, config.serviceRoleKey, config.options);
}
