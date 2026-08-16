import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { initialBookGeneralFormValues } from '../types/book-form-state';
import { BookGeneralSection } from './book-general-section';

function renderBookGeneralSection() {
  return renderToStaticMarkup(
    <BookGeneralSection
      values={initialBookGeneralFormValues}
      errors={{}}
      touched={{}}
      isSlugManuallyEdited={false}
      onTextChange={vi.fn()}
      onBooleanChange={vi.fn()}
      onFieldBlur={vi.fn()}
      onSlugReset={vi.fn()}
    />,
  );
}

describe('BookGeneralSection language selector', () => {
  it('includes the editorial language options used by create and edit book forms', () => {
    const html = renderBookGeneralSection();

    expect(html).toContain('<option value="gl">Gallego</option>');
    expect(html).toContain('<option value="ast">Asturiano</option>');
    expect(html).toContain('<option value="la">Latín</option>');
  });
});
