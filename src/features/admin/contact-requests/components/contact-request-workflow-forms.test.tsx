import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../actions/add-contact-request-note', () => ({
  addContactRequestNoteAction: vi.fn(),
}));
vi.mock('../actions/transition-contact-request-status', () => ({
  transitionContactRequestStatusAction: vi.fn(),
}));

import { ContactRequestWorkflowForms } from './contact-request-workflow-forms';

describe('ContactRequestWorkflowForms', () => {
  it('offers active destinations and appends notes without exposing legacy note fields', () => {
    const html = renderToStaticMarkup(
      <ContactRequestWorkflowForms
        contactRequestId="45aa8657-bf26-4b62-bc01-8ba7570d7bbb"
        currentStatus="new"
        activeStatuses={[
          {
            key: 'new',
            label: 'Nuevo',
            classification: 'open',
            sortOrder: 0,
            isActive: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            key: 'no_answer',
            label: 'No contesta',
            classification: 'open',
            sortOrder: 40,
            isActive: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ]}
      />,
    );

    expect(html).toContain('name="newStatus"');
    expect(html).toContain('No contesta');
    expect(html).toContain('name="body"');
    expect(html).not.toContain('internalNotes');
  });
});
