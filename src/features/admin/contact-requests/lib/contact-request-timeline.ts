import type { ContactRequestNote, ContactRequestStatusHistoryEntry } from '@/db/schema';

export type ContactRequestTimelineItem =
  | {
      id: string;
      kind: 'note';
      sortAt: Date;
      isLegacy: boolean;
      authorName: string | null;
      body: string;
    }
  | {
      id: string;
      kind: 'status';
      sortAt: Date;
      isLegacy: boolean;
      authorName: string | null;
      previousStatus: string | null;
      newStatus: string;
    };

export function createContactRequestTimeline(
  notes: Array<{ note: ContactRequestNote; authorName: string | null }>,
  history: Array<{ history: ContactRequestStatusHistoryEntry; authorName: string | null }>,
): ContactRequestTimelineItem[] {
  const timeline: ContactRequestTimelineItem[] = [
    ...notes.map(({ note, authorName }) => ({
      id: note.id,
      kind: 'note' as const,
      sortAt: note.createdAt,
      isLegacy: note.isLegacy,
      authorName,
      body: note.body,
    })),
    ...history.map(({ history: entry, authorName }) => ({
      id: entry.id,
      kind: 'status' as const,
      sortAt: entry.changedAt,
      isLegacy: entry.isLegacy,
      authorName,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
    })),
  ];

  return timeline.sort(
    (left, right) =>
      left.sortAt.getTime() - right.sortAt.getTime() ||
      left.id.localeCompare(right.id) ||
      left.kind.localeCompare(right.kind),
  );
}
