import { describe, expect, it } from 'vitest';

import { getSafeNextPath } from './safe-next-path';

describe('getSafeNextPath', () => {
  it.each(['/admin', '/admin/libros', '/admin?foo=bar', '/admin#section'])(
    'accepts internal path %s',
    (next) => {
      expect(getSafeNextPath(next)).toBe(next);
    },
  );

  it.each([
    'https://evil.example',
    'http://evil.example',
    '//evil.example',
    'javascript:alert(1)',
    'data:text/html,test',
    '',
  ])('falls back for unsafe path %s', (next) => {
    expect(getSafeNextPath(next)).toBe('/admin');
  });

  it('falls back for a missing path', () => {
    expect(getSafeNextPath(null)).toBe('/admin');
  });
});
