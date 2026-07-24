import { describe, expect, it } from 'vitest';

import { toPlainPublicText } from './text-format';

describe('toPlainPublicText', () => {
  it('keeps empty content as null', () => {
    expect(toPlainPublicText(null)).toBeNull();
    expect(toPlainPublicText('   ')).toBeNull();
  });

  it('converts simple legacy HTML to readable plain text', () => {
    expect(toPlainPublicText('<p>Primera línea</p><p>Segunda &amp; tercera</p>')).toBe(
      'Primera línea\n\nSegunda & tercera',
    );
  });

  it('preserves line breaks from br tags', () => {
    expect(toPlainPublicText('Uno<br>Dos<br />Tres')).toBe('Uno\nDos\nTres');
  });
});
