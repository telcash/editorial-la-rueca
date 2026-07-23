import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { assertPilotApplyEnvironment, getPilotCliEnvStatus, loadPilotCliEnv } from './env';

const envKeys = [
  'NODE_ENV',
  'DATABASE_URL',
  'DATABASE_MIGRATION_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

function withCleanEnv(callback: () => void) {
  const previousValues = new Map<(typeof envKeys)[number], string | undefined>();

  for (const key of envKeys) {
    previousValues.set(key, process.env[key]);
    Reflect.deleteProperty(process.env, key);
  }

  try {
    callback();
  } finally {
    for (const key of envKeys) {
      const previousValue = previousValues.get(key);

      if (previousValue === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        Reflect.set(process.env, key, previousValue);
      }
    }
  }
}

describe('pilot migration env helpers', () => {
  it('loads .env.local for the CLI', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'pilot-env-'));
    await writeFile(
      path.join(directory, '.env.local'),
      [
        'DATABASE_URL=postgres://runtime.example/db',
        'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-secret-value',
      ].join('\n'),
      'utf8',
    );

    withCleanEnv(() => {
      Reflect.set(process.env, 'NODE_ENV', 'development');
      loadPilotCliEnv(directory);

      expect(getPilotCliEnvStatus()).toEqual({
        databaseRuntime: 'configured',
        supabaseUrl: 'configured',
        supabasePublishableKey: 'configured',
        supabaseMigrationServiceRole: 'missing',
      });
    });
  });

  it('recognizes the runtime DATABASE_URL and Supabase anon fallback', () => {
    const status = getPilotCliEnvStatus({
      DATABASE_URL: 'postgres://runtime.example/db',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-secret-value',
    });

    expect(status).toEqual({
      databaseRuntime: 'configured',
      supabaseUrl: 'configured',
      supabasePublishableKey: 'configured',
      supabaseMigrationServiceRole: 'missing',
    });
  });

  it('blocks apply when required env vars are missing', () => {
    expect(() => assertPilotApplyEnvironment({})).toThrow('Faltan variables de entorno para apply');
  });

  it('requires service role only when Storage migration credentials are needed', () => {
    const env = {
      DATABASE_URL: 'postgres://runtime.example/db',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-secret-value',
    };

    expect(() => assertPilotApplyEnvironment(env)).not.toThrow();
    expect(() =>
      assertPilotApplyEnvironment(env, {
        requireStorageCredentials: true,
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('does not include secret values in env errors', () => {
    const secret = 'super-secret-value';

    expect(() =>
      assertPilotApplyEnvironment({
        DATABASE_MIGRATION_URL: secret,
      }),
    ).toThrow(/DATABASE_URL/);

    try {
      assertPilotApplyEnvironment({
        DATABASE_MIGRATION_URL: secret,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
