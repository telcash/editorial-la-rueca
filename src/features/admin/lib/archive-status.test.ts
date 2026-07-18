import { describe, expect, it } from 'vitest';

import { parseArchiveStatus } from './archive-status';

describe('parseArchiveStatus', () => {
  it('defaults to active', () => {
    expect(parseArchiveStatus(undefined)).toBe('active');
  });

  it('accepts archived and all', () => {
    expect(parseArchiveStatus('archived')).toBe('archived');
    expect(parseArchiveStatus('all')).toBe('all');
  });

  it('uses active for invalid values', () => {
    expect(parseArchiveStatus('invalid')).toBe('active');
  });

  it('uses the first value when query params are repeated', () => {
    expect(parseArchiveStatus(['archived', 'all'])).toBe('archived');
  });
});
