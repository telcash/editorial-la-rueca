import { describe, expect, it, vi } from 'vitest';

import {
  normalizeSmokeBaseUrl,
  productionSmokeRoutes,
  runProductionSmoke,
} from './production-smoke-core';

function response(status: number, body: string) {
  return new Response(body, { status });
}

function createFetchMock(responses: Array<Response | Error>) {
  return vi.fn(async () => {
    const nextResponse = responses.shift();

    if (nextResponse instanceof Error) {
      throw nextResponse;
    }

    if (!nextResponse) {
      throw new Error('Missing test response.');
    }

    return nextResponse;
  }) as unknown as typeof fetch;
}

describe('production smoke core', () => {
  it('normalizes an HTTP base URL and rejects invalid protocols or credentials', () => {
    expect(normalizeSmokeBaseUrl('https://preview.example.com///').toString()).toBe(
      'https://preview.example.com/',
    );
    expect(() => normalizeSmokeBaseUrl('ftp://preview.example.com')).toThrow(
      'debe usar http o https',
    );
    expect(() => normalizeSmokeBaseUrl('https://user:pass@preview.example.com')).toThrow(
      'no puede incluir credenciales',
    );
  });

  it('passes the six critical checks with valid responses', async () => {
    const fetchMock = createFetchMock([
      response(200, '<html lang="es"></html>'),
      response(200, '<html lang="es"></html>'),
      response(200, '<html lang="es"></html>'),
      response(200, 'User-agent: *\nAllow: /\n'),
      response(200, '<?xml version="1.0"?><urlset></urlset>'),
      response(404, '<html lang="es"></html>'),
    ]);

    const results = await runProductionSmoke({
      baseUrl: normalizeSmokeBaseUrl('https://preview.example.com'),
      fetchFn: fetchMock,
    });

    expect(results).toHaveLength(productionSmokeRoutes.length);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('reports unexpected status without exposing the response body', async () => {
    const fetchMock = createFetchMock([
      response(500, 'internal secret details'),
      response(200, '<html></html>'),
      response(200, '<html></html>'),
      response(200, 'User-agent: *\nDisallow: /admin\n'),
      response(200, '<urlset></urlset>'),
      response(404, ''),
    ]);

    const [result] = await runProductionSmoke({
      baseUrl: normalizeSmokeBaseUrl('https://preview.example.com'),
      fetchFn: fetchMock,
    });

    expect(result.passed).toBe(false);
    expect(result.receivedStatus).toBe(500);
    expect(result.message).not.toContain('internal secret details');
  });

  it('rejects invalid robots and sitemap bodies', async () => {
    const fetchMock = createFetchMock([
      response(200, '<html></html>'),
      response(200, '<html></html>'),
      response(200, '<html></html>'),
      response(200, 'not robots'),
      response(200, '<html>not xml</html>'),
      response(404, ''),
    ]);

    const results = await runProductionSmoke({
      baseUrl: normalizeSmokeBaseUrl('https://preview.example.com'),
      fetchFn: fetchMock,
    });

    expect(results[3]?.message).toContain('robots.txt');
    expect(results[4]?.message).toContain('sitemap XML');
  });

  it('reports a timeout and an incorrect not-found response', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    }) as unknown as typeof fetch;

    const results = await runProductionSmoke({
      baseUrl: normalizeSmokeBaseUrl('https://preview.example.com'),
      fetchFn: fetchMock,
      timeoutMs: 1,
    });

    expect(results.every((result) => result.passed === false)).toBe(true);
    expect(results[0]?.message).toContain('Timeout');
  });
});
