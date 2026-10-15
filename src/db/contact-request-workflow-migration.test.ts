import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createContactRequestNoteSchema } from '@/schemas/contact-requests/contact-request-workflow.schema';

const migration = readFileSync(
  join(process.cwd(), 'drizzle/0011_contact_request_workflow.sql'),
  'utf8',
);

describe('contact request workflow migration security and legacy contract', () => {
  it.each([
    ['empty', ''],
    ['spaces', '     '],
    ['over 10000 characters', 'x'.repeat(10001)],
  ])('preserves %s legacy note bodies without transforming them', (_case, body) => {
    expect(
      createContactRequestNoteSchema.safeParse({
        contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
        body,
      }).success,
    ).toBe(false);
    expect(migration).toMatch(
      /"contact_request_notes_body_check" CHECK \([\s\S]*?"is_legacy" = true OR \([\s\S]*?char_length\("body"\) BETWEEN 1 AND 10000[\s\S]*?\)\s*\)/,
    );
    expect(migration).toMatch(
      /INSERT INTO "contact_request_notes" \("contact_request_id", "body", "is_legacy"\)\s*SELECT "id", "internal_notes", true\s*FROM "contact_requests"\s*WHERE "internal_notes" IS NOT NULL/,
    );
    expect(migration).not.toMatch(
      /SELECT\s+"id",\s*(trim|btrim|left|substring)\("internal_notes"/i,
    );
  });

  it('does not grant authenticated clients direct inserts into status history', () => {
    expect(migration).not.toMatch(
      /CREATE POLICY "contact_request_status_history_[^"]+"[^;]*FOR INSERT/i,
    );
    expect(migration).not.toMatch(
      /GRANT [^;]*INSERT[^;]*ON TABLE[^;]*contact_request_status_history/i,
    );
    expect(migration).toMatch(
      /GRANT SELECT ON TABLE "contact_request_status_history" TO authenticated/,
    );
  });

  it('limits authenticated profile updates to non-privileged profile fields', () => {
    expect(migration).toMatch(
      /REVOKE UPDATE ON TABLE public\.profiles FROM PUBLIC, anon, authenticated/,
    );
    expect(migration).toMatch(
      /GRANT UPDATE \(display_name, avatar_url\) ON TABLE public\.profiles TO authenticated/,
    );
  });
});
