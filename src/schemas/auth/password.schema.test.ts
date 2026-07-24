import { describe, expect, it } from 'vitest';

import { passwordResetRequestSchema, updatePasswordSchema } from './password.schema';

describe('password auth schemas', () => {
  it('accepts a valid reset email', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'admin@example.com' }).success).toBe(true);
  });

  it('rejects invalid reset emails', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'invalid' }).success).toBe(false);
  });

  it('accepts matching strong enough passwords', () => {
    expect(
      updatePasswordSchema.safeParse({
        password: 'new-password',
        confirmPassword: 'new-password',
      }).success,
    ).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'new-password',
      confirmPassword: 'another-password',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
    }
  });
});
