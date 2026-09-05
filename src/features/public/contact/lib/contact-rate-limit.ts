import 'server-only';

import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = '15 m' as const;
const RATE_LIMIT_TIMEOUT_MS = 1500;
const RATE_LIMIT_PREFIX = 'public-contact';

export interface ContactRateLimiter {
  limit(identifier: string): Promise<{ success: boolean }>;
}

export interface ContactRateLimitResult {
  allowed: boolean;
  reason: 'allowed' | 'blocked' | 'missing-ip' | 'unavailable';
}

function getFirstHeaderValue(value: string | null): string | null {
  const firstValue = value?.split(',')[0]?.trim();

  return firstValue || null;
}

export function getClientIp(requestHeaders: Headers): string | null {
  const headerNames = ['x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip'];

  for (const headerName of headerNames) {
    const candidate = getFirstHeaderValue(requestHeaders.get(headerName));

    if (candidate && isIP(candidate) !== 0) {
      return candidate;
    }
  }

  return null;
}

export function createContactRateLimitIdentifier(ip: string, secret: string): string {
  const digest = createHmac('sha256', secret).update(ip).digest('hex');

  return `${RATE_LIMIT_PREFIX}:ip:${digest}`;
}

function createRateLimiter(): ContactRateLimiter | null {
  const url = process.env.RATE_LIMIT_KV_REST_API_URL;
  const token = process.env.RATE_LIMIT_KV_REST_API_TOKEN;
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;

  if (!url || !token || !secret) {
    console.warn('[PublicContactRateLimit] Limiter unavailable; continuing without blocking.');
    return null;
  }

  const redis = new Redis({ url, token });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT, RATE_LIMIT_WINDOW),
    prefix: RATE_LIMIT_PREFIX,
    timeout: RATE_LIMIT_TIMEOUT_MS,
  });
}

let rateLimiter: ContactRateLimiter | null | undefined;

function getRateLimiter(): ContactRateLimiter | null {
  if (rateLimiter === undefined) {
    rateLimiter = createRateLimiter();
  }

  return rateLimiter;
}

export async function checkContactRateLimit(
  requestHeaders: Headers,
  limiter?: ContactRateLimiter | null,
): Promise<ContactRateLimitResult> {
  const ip = getClientIp(requestHeaders);

  if (!ip) {
    console.warn('[PublicContactRateLimit] No valid client IP; continuing without blocking.');
    return { allowed: true, reason: 'missing-ip' };
  }

  const secret = process.env.RATE_LIMIT_HMAC_SECRET;

  const activeLimiter = limiter === undefined ? getRateLimiter() : limiter;

  if (!secret || !activeLimiter) {
    return { allowed: true, reason: 'unavailable' };
  }

  try {
    const result = await activeLimiter.limit(createContactRateLimitIdentifier(ip, secret));

    return result.success
      ? { allowed: true, reason: 'allowed' }
      : { allowed: false, reason: 'blocked' };
  } catch {
    console.error('[PublicContactRateLimit] Rate limit check failed', {
      message: 'Rate limit backend unavailable.',
    });

    return { allowed: true, reason: 'unavailable' };
  }
}
