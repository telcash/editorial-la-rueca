import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContactRequestStatusBadge } from './contact-request-status-badge';

describe('ContactRequestStatusBadge', () => {
  it('renders accessible text for every commercial status', () => {
    const html = renderToStaticMarkup(
      <div>
        <ContactRequestStatusBadge label="Nuevo" classification="open" />
        <ContactRequestStatusBadge label="Contactado" classification="open" />
        <ContactRequestStatusBadge label="En seguimiento" classification="open" />
        <ContactRequestStatusBadge label="No contesta" classification="open" />
        <ContactRequestStatusBadge label="Ganado" classification="won" />
        <ContactRequestStatusBadge label="Perdido" classification="lost" />
      </div>,
    );

    expect(html).toContain('Nuevo');
    expect(html).toContain('Contactado');
    expect(html).toContain('En seguimiento');
    expect(html).toContain('Ganado');
    expect(html).toContain('Perdido');
    expect(html).toContain('No contesta');
  });

  it('renders custom catalog labels without requiring a static enum', () => {
    const html = renderToStaticMarkup(
      <ContactRequestStatusBadge label="Esperando revisión" classification="open" />,
    );

    expect(html).toContain('Esperando revisión');
  });
});
