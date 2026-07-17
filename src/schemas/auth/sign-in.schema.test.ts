import { describe, expect, it } from 'vitest';

import { signInSchema } from './sign-in.schema';

describe('signInSchema', () => {
  it('accepts valid email and password input', () => {
    expect(
      signInSchema.parse({
        email: ' equipo@example.com ',
        password: 'secret',
      }),
    ).toEqual({
      email: 'equipo@example.com',
      password: 'secret',
    });
  });

  it('rejects invalid email values', () => {
    expect(() =>
      signInSchema.parse({
        email: 'not-an-email',
        password: 'secret',
      }),
    ).toThrow();
  });

  it('rejects empty passwords', () => {
    expect(() =>
      signInSchema.parse({
        email: 'equipo@example.com',
        password: '',
      }),
    ).toThrow();
  });
});
