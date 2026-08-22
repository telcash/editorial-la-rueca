import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { ContactRequestAdminListItem } from '@/services/contact-requests/contact-request.types';
import { ContactRequestsTable } from './contact-requests-table';

const contactRequest: ContactRequestAdminListItem = {
  id: '45aa8657-bf26-4b62-bc01-8ba7570d7bbb',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+34 600 111 222',
  province: 'Madrid',
  status: 'in_progress',
  source: 'instagram',
  emailSentAt: new Date('2026-02-01T10:01:00.000Z'),
  emailError: null,
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
  service: {
    id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
    name: 'Corrección de manuscrito',
    slug: 'correccion-de-manuscrito',
  },
};

describe('ContactRequestsTable', () => {
  it('renders lead contact data, service, status, source and detail action', () => {
    const html = renderToStaticMarkup(<ContactRequestsTable contactRequests={[contactRequest]} />);

    expect(html).toContain('Ana Pérez');
    expect(html).toContain('mailto:ana@example.com');
    expect(html).toContain('tel:+34 600 111 222');
    expect(html).toContain('Madrid');
    expect(html).toContain('Corrección de manuscrito');
    expect(html).toContain('En seguimiento');
    expect(html).toContain('Instagram');
    expect(html).toContain('Email enviado');
    expect(html).toContain('/admin/contact-requests/45aa8657-bf26-4b62-bc01-8ba7570d7bbb');
  });

  it('shows a discreet warning when email notification is pending or failed', () => {
    const html = renderToStaticMarkup(
      <ContactRequestsTable
        contactRequests={[
          {
            ...contactRequest,
            emailSentAt: null,
            emailError: 'SMTP timeout',
          },
        ]}
      />,
    );

    expect(html).toContain('Email pendiente');
  });
});
