import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { verifyMetaWebhookChallenge, verifyMetaWebhookSignature } from './meta-webhook-security';

describe('Meta webhook security', () => {
  it('accepts only the subscribe challenge with the configured token', () => {
    expect(verifyMetaWebhookChallenge('subscribe', 'verify', 'verify', 'challenge')).toBe(true);
    expect(verifyMetaWebhookChallenge('subscribe', 'wrong', 'verify', 'challenge')).toBe(false);
    expect(verifyMetaWebhookChallenge('other', 'verify', 'verify', 'challenge')).toBe(false);
    expect(verifyMetaWebhookChallenge('subscribe', 'verify', 'verify', null)).toBe(false);
  });

  it('validates the HMAC signature against the exact raw bytes', () => {
    const body = Buffer.from('{"entry":[]}');
    const digest = createHmac('sha256', 'test-app-secret').update(body).digest('hex');

    expect(verifyMetaWebhookSignature(body, `sha256=${digest}`, 'test-app-secret')).toBe(true);
    expect(
      verifyMetaWebhookSignature(
        Buffer.from('{"entry": []}'),
        `sha256=${digest}`,
        'test-app-secret',
      ),
    ).toBe(false);
    expect(verifyMetaWebhookSignature(body, digest, 'test-app-secret')).toBe(false);
    expect(verifyMetaWebhookSignature(body, null, 'test-app-secret')).toBe(false);
  });
});
