import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContactRequestStatusBadge } from './contact-request-status-badge';

describe('ContactRequestStatusBadge', () => {
  it('renders accessible text for every commercial status', () => {
    const html = renderToStaticMarkup(
      <div>
        <ContactRequestStatusBadge status="new" />
        <ContactRequestStatusBadge status="contacted" />
        <ContactRequestStatusBadge status="in_progress" />
        <ContactRequestStatusBadge status="won" />
        <ContactRequestStatusBadge status="lost" />
      </div>,
    );

    expect(html).toContain('Nuevo');
    expect(html).toContain('Contactado');
    expect(html).toContain('En seguimiento');
    expect(html).toContain('Ganado');
    expect(html).toContain('Perdido');
  });
});
