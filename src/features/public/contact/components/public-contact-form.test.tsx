import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PublicContactForm } from './public-contact-form';

vi.mock('../actions/submit-public-contact', () => ({
  submitPublicContactAction: vi.fn(),
}));

describe('PublicContactForm', () => {
  it('renders dynamic services as serviceId options', () => {
    const html = renderToStaticMarkup(
      <PublicContactForm
        services={[
          {
            id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
            name: 'Corrección de manuscrito',
          },
          {
            id: 'c89ff281-8f18-4c90-b4b6-ec7de7414103',
            name: 'Ghostwriting',
          },
        ]}
      />,
    );

    expect(html).toContain('name="serviceId"');
    expect(html).toContain('Corrección de manuscrito');
    expect(html).toContain('Ghostwriting');
    expect(html).toContain('Provincia');
    expect(html).toContain('Solicitar información');
  });

  it('renders a safe empty state when there are no published services', () => {
    const html = renderToStaticMarkup(<PublicContactForm services={[]} />);

    expect(html).toContain('no hay servicios publicados');
    expect(html).toContain('disabled=""');
  });
});
