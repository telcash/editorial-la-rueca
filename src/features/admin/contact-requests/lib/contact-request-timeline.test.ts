import { describe, expect, it } from 'vitest';

import { createContactRequestTimeline } from './contact-request-timeline';

const timestamp = new Date('2026-09-01T10:00:00.000Z');

describe('createContactRequestTimeline', () => {
  it('orders notes and status changes chronologically with a stable id tie-breaker', () => {
    const timeline = createContactRequestTimeline(
      [
        {
          note: {
            id: 'b-note',
            contactRequestId: 'request',
            authorProfileId: null,
            body: 'Nota',
            isLegacy: false,
            createdAt: timestamp,
          },
          authorName: 'Almudena',
        },
      ],
      [
        {
          history: {
            id: 'a-event',
            contactRequestId: 'request',
            previousStatus: 'new',
            newStatus: 'contacted',
            changedByProfileId: null,
            isLegacy: false,
            changedAt: timestamp,
          },
          authorName: 'Almudena',
        },
      ],
    );

    expect(timeline.map(({ id }) => id)).toEqual(['a-event', 'b-note']);
  });

  it('preserves legacy flags and unknown authors for imported records', () => {
    const [item] = createContactRequestTimeline(
      [
        {
          note: {
            id: 'legacy-note',
            contactRequestId: 'request',
            authorProfileId: null,
            body: 'Nota anterior',
            isLegacy: true,
            createdAt: timestamp,
          },
          authorName: null,
        },
      ],
      [],
    );

    expect(item).toMatchObject({ isLegacy: true, authorName: null, body: 'Nota anterior' });
  });
});
