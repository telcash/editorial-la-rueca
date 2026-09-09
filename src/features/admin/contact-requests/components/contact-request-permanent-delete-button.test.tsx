import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../actions/delete-contact-request-permanently', () => ({
  deleteContactRequestPermanentlyAction: vi.fn(),
}));

const { ContactRequestPermanentDeleteButton } =
  await import('./contact-request-permanent-delete-button');

describe('ContactRequestPermanentDeleteButton', () => {
  it('renders the destructive detail action without exposing the dialog initially', () => {
    const html = renderToStaticMarkup(
      <ContactRequestPermanentDeleteButton
        contactRequestId="45aa8657-bf26-4b62-bc01-8ba7570d7bbb"
        entityLabel="Ana Pérez · ana@example.com"
      />,
    );

    expect(html).toContain('Eliminar solicitud definitivamente');
    expect(html).not.toContain('Escribe ELIMINAR para continuar');
  });
});
