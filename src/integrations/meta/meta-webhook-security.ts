import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function constantTimeStringEqual(candidate: string, expected: string): boolean {
  const candidateDigest = createHash('sha256').update(candidate).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();

  return timingSafeEqual(candidateDigest, expectedDigest);
}

export function verifyMetaWebhookChallenge(
  mode: string | null,
  candidateToken: string | null,
  expectedToken: string,
  challenge: string | null,
): challenge is string {
  return (
    mode === 'subscribe' &&
    candidateToken !== null &&
    candidateToken.length <= 512 &&
    challenge !== null &&
    constantTimeStringEqual(candidateToken, expectedToken)
  );
}

export function verifyMetaWebhookSignature(
  rawBody: string | Uint8Array,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) {
    return false;
  }

  const suppliedDigest = Buffer.from(signatureHeader.slice('sha256='.length), 'hex');
  const expectedDigest = createHmac('sha256', appSecret).update(rawBody).digest();

  return (
    suppliedDigest.length === expectedDigest.length &&
    timingSafeEqual(suppliedDigest, expectedDigest)
  );
}
