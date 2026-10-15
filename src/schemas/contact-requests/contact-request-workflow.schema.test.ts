import { describe, expect, it } from 'vitest';

import {
  parseContactRequestListQuery,
  toContactRequestFilters,
} from '@/features/admin/contact-requests/lib/contact-request-list-query';

import {
  createContactRequestNoteSchema,
  createContactRequestStatusSchema,
  transitionContactRequestStatusSchema,
  updateContactRequestStatusDefinitionSchema,
} from './contact-request-workflow.schema';

describe('contact request workflow schemas', () => {
  it('accepts a custom status with an immutable internal key and a supported classification', () => {
    expect(
      createContactRequestStatusSchema.parse({
        key: 'awaiting_reply',
        label: 'Esperando respuesta',
        classification: 'open',
      }),
    ).toEqual({
      key: 'awaiting_reply',
      label: 'Esperando respuesta',
      classification: 'open',
      sortOrder: 0,
    });
  });

  it('rejects malformed keys and unsupported classifications', () => {
    expect(
      createContactRequestStatusSchema.safeParse({
        key: 'No contesta',
        label: 'No contesta',
        classification: 'pending',
      }).success,
    ).toBe(false);
  });

  it('rejects the reserved all status key while preserving the Todos filter', () => {
    for (const key of ['all', ' all ']) {
      expect(
        createContactRequestStatusSchema.safeParse({
          key,
          label: 'Todos',
          classification: 'open',
        }).success,
      ).toBe(false);
    }

    const query = parseContactRequestListQuery({ status: 'all' });
    expect(query.status).toBe('all');
    expect(toContactRequestFilters(query).status).toBe('all');
  });

  it('does not allow a status key to be changed by the update contract', () => {
    expect(
      updateContactRequestStatusDefinitionSchema.safeParse({
        key: 'renamed',
        label: 'Nuevo nombre',
      }).success,
    ).toBe(false);
  });

  it('validates independent notes and status transition actor ids', () => {
    expect(
      createContactRequestNoteSchema.safeParse({
        contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
        body: '  Se ha enviado un correo.  ',
      }).data?.body,
    ).toBe('Se ha enviado un correo.');

    expect(
      transitionContactRequestStatusSchema.safeParse({
        contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
        newStatus: 'no_answer',
      }).success,
    ).toBe(true);
  });

  it.each(['', '   ', '\t\n', 'x'.repeat(10001)])(
    'keeps strict validation for new notes with invalid legacy-shaped content (%j)',
    (body) => {
      expect(
        createContactRequestNoteSchema.safeParse({
          contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
          body,
        }).success,
      ).toBe(false);
    },
  );
});
