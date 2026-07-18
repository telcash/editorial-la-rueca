import { describe, expect, it } from 'vitest';

import {
  isPermanentDeleteConfirmationValid,
  PERMANENT_DELETE_CONFIRMATION,
} from './permanent-delete-confirmation';

describe('permanent delete confirmation', () => {
  it('accepts only the exact confirmation text', () => {
    expect(isPermanentDeleteConfirmationValid(PERMANENT_DELETE_CONFIRMATION)).toBe(true);
    expect(isPermanentDeleteConfirmationValid('eliminar')).toBe(false);
    expect(isPermanentDeleteConfirmationValid(' ELIMINAR ')).toBe(false);
  });
});
