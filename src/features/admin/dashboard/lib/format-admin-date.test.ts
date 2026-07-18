import { describe, expect, it } from 'vitest';

import { formatAdminDate } from './format-admin-date';

describe('formatAdminDate', () => {
  it('formats dates with Spanish abbreviated month names', () => {
    expect(formatAdminDate(new Date('2026-07-18T10:00:00.000Z'))).toBe('18 jul 2026');
  });
});
