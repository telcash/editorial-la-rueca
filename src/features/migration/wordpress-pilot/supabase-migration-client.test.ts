import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('Supabase migration client config', () => {
  it('uses service role credentials with session persistence disabled', async () => {
    const { getSupabaseMigrationClientConfig } = await import('./supabase-migration-client');
    const config = getSupabaseMigrationClientConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
    });

    expect(config.supabaseUrl).toBe('https://example.supabase.co');
    expect(config.serviceRoleKey).toBe('service-role-secret');
    expect(config.options.auth).toEqual({
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    });
  });

  it('throws a safe error when service role credentials are missing', async () => {
    const { getSupabaseMigrationClientConfig } = await import('./supabase-migration-client');
    const secret = 'service-role-secret';

    expect(() =>
      getSupabaseMigrationClientConfig({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);

    try {
      getSupabaseMigrationClientConfig({
        SUPABASE_SERVICE_ROLE_KEY: secret,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
