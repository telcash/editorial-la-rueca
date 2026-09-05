import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  checkContactRateLimit,
  createContactRateLimitIdentifier,
  getClientIp,
  type ContactRateLimiter,
} from './contact-rate-limit';

const IP = '203.0.113.10';

function createHeaders(value?: string, name = 'x-forwarded-for'): Headers {
  const requestHeaders = new Headers();

  if (value) {
    requestHeaders.set(name, value);
  }

  return requestHeaders;
}

function createLimiter(success: boolean | Error): ContactRateLimiter {
  return {
    limit:
      success instanceof Error
        ? vi.fn().mockRejectedValue(success)
        : vi.fn().mockResolvedValue({ success }),
  };
}

describe('contact rate limit', () => {
  beforeEach(() => {
    vi.stubEnv('RATE_LIMIT_HMAC_SECRET', 'test-secret');
  });

  it('uses the first valid IP from the configured header priority', () => {
    expect(
      getClientIp(
        new Headers({
          'x-vercel-forwarded-for': 'invalid, 198.51.100.1',
          'x-forwarded-for': '203.0.113.10, 198.51.100.2',
          'x-real-ip': '198.51.100.3',
        }),
      ),
    ).toBe('203.0.113.10');
    expect(getClientIp(createHeaders('198.51.100.3', 'x-real-ip'))).toBe('198.51.100.3');
  });

  it('fails open without a valid IP and does not call Redis', async () => {
    const limiter = createLimiter(true);

    await expect(checkContactRateLimit(createHeaders('not-an-ip'), limiter)).resolves.toEqual({
      allowed: true,
      reason: 'missing-ip',
    });
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('allows requests until the limiter reports the limit was exceeded', async () => {
    const limiter = createLimiter(true);

    await expect(checkContactRateLimit(createHeaders(IP), limiter)).resolves.toEqual({
      allowed: true,
      reason: 'allowed',
    });
    expect(limiter.limit).toHaveBeenCalledWith(
      expect.stringMatching(/^public-contact:ip:[a-f0-9]{64}$/),
    );
  });

  it('blocks a request reported as over the sliding-window limit', async () => {
    await expect(checkContactRateLimit(createHeaders(IP), createLimiter(false))).resolves.toEqual({
      allowed: false,
      reason: 'blocked',
    });
  });

  it('fails open when Redis fails', async () => {
    await expect(
      checkContactRateLimit(createHeaders(IP), createLimiter(new Error('secret backend detail'))),
    ).resolves.toEqual({
      allowed: true,
      reason: 'unavailable',
    });
  });

  it('fails open when configuration is unavailable', async () => {
    vi.stubEnv('RATE_LIMIT_HMAC_SECRET', '');
    const limiter = createLimiter(true);

    await expect(checkContactRateLimit(createHeaders(IP), limiter)).resolves.toEqual({
      allowed: true,
      reason: 'unavailable',
    });
    expect(limiter.limit).not.toHaveBeenCalled();
  });

  it('creates deterministic opaque identifiers that never contain the IP', () => {
    const identifier = createContactRateLimitIdentifier(IP, 'test-secret');

    expect(identifier).toBe(createContactRateLimitIdentifier(IP, 'test-secret'));
    expect(identifier).not.toContain(IP);
    expect(identifier).not.toContain('test-secret');
    expect(identifier).toMatch(/^public-contact:ip:[a-f0-9]{64}$/);
    expect(createContactRateLimitIdentifier('203.0.113.11', 'test-secret')).not.toBe(identifier);
  });
});
