import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDatabaseUrl } from './database-env';

describe('getDatabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a valid PostgreSQL connection URL', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://user:password@example.com:5432/editorial');

    expect(getDatabaseUrl()).toBe('postgresql://user:password@example.com:5432/editorial');
  });

  it('rejects a missing URL without exposing a value', () => {
    vi.stubEnv('DATABASE_URL', '');

    expect(() => getDatabaseUrl()).toThrow('DATABASE_URL is required.');
  });

  it('rejects an invalid URL without exposing a value', () => {
    vi.stubEnv('DATABASE_URL', 'not-a-database-url');

    expect(() => getDatabaseUrl()).toThrow(
      'DATABASE_URL must be a valid PostgreSQL connection URL.',
    );
  });
});
