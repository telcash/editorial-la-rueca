import { describe, expect, it } from 'vitest';

import { isEditorialRole } from './access.policy';

describe('isEditorialRole', () => {
  it('accepts admin and editor roles', () => {
    expect(isEditorialRole('admin')).toBe(true);
    expect(isEditorialRole('editor')).toBe(true);
  });

  it('rejects non-editorial roles and missing roles', () => {
    expect(isEditorialRole('viewer')).toBe(false);
    expect(isEditorialRole(null)).toBe(false);
    expect(isEditorialRole(undefined)).toBe(false);
  });
});
