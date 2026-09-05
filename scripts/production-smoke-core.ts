export const PRODUCTION_SMOKE_TIMEOUT_MS = 10_000;

export interface SmokeRoute {
  path: string;
  expectedStatus: number;
  validateBody?: (body: string) => boolean;
  invalidBodyMessage?: string;
}

export interface SmokeRouteResult {
  path: string;
  expectedStatus: number;
  receivedStatus: number | null;
  passed: boolean;
  message?: string;
}

export interface RunProductionSmokeOptions {
  baseUrl: URL;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export const productionSmokeRoutes: SmokeRoute[] = [
  {
    path: '/',
    expectedStatus: 200,
    validateBody: (body) => /<html\b/i.test(body),
    invalidBodyMessage: 'La respuesta no parece HTML.',
  },
  {
    path: '/libros',
    expectedStatus: 200,
    validateBody: (body) => /<html\b/i.test(body),
    invalidBodyMessage: 'La respuesta no parece HTML.',
  },
  {
    path: '/autores',
    expectedStatus: 200,
    validateBody: (body) => /<html\b/i.test(body),
    invalidBodyMessage: 'La respuesta no parece HTML.',
  },
  {
    path: '/robots.txt',
    expectedStatus: 200,
    validateBody: (body) =>
      /^\s*user-agent\s*:\s*\*/im.test(body) && /^(?:allow|disallow)\s*:/im.test(body),
    invalidBodyMessage: 'La respuesta no parece un robots.txt válido.',
  },
  {
    path: '/sitemap.xml',
    expectedStatus: 200,
    validateBody: (body) => /<(?:urlset|sitemapindex)\b/i.test(body),
    invalidBodyMessage: 'La respuesta no parece un sitemap XML válido.',
  },
  {
    path: '/__production-smoke-not-found',
    expectedStatus: 404,
  },
];

export function normalizeSmokeBaseUrl(value: string): URL {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error('Falta --base-url.');
  }

  let url: URL;

  try {
    url = new URL(trimmedValue);
  } catch {
    throw new Error('--base-url no es una URL válida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('--base-url debe usar http o https.');
  }

  if (url.username || url.password) {
    throw new Error('--base-url no puede incluir credenciales.');
  }

  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';

  return url;
}

function buildRouteUrl(baseUrl: URL, path: string): string {
  const basePath = baseUrl.pathname === '/' ? '' : baseUrl.pathname;
  return new URL(`${basePath}${path}`, `${baseUrl.origin}/`).toString();
}

async function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchFn(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runProductionSmoke({
  baseUrl,
  fetchFn = fetch,
  timeoutMs = PRODUCTION_SMOKE_TIMEOUT_MS,
}: RunProductionSmokeOptions): Promise<SmokeRouteResult[]> {
  const results: SmokeRouteResult[] = [];

  for (const route of productionSmokeRoutes) {
    try {
      const response = await fetchWithTimeout(
        fetchFn,
        buildRouteUrl(baseUrl, route.path),
        timeoutMs,
      );
      const body = await response.text();

      if (response.status !== route.expectedStatus) {
        results.push({
          path: route.path,
          expectedStatus: route.expectedStatus,
          receivedStatus: response.status,
          passed: false,
          message: `Se esperaba ${route.expectedStatus} y se recibió ${response.status}.`,
        });
        continue;
      }

      if (route.validateBody && !route.validateBody(body)) {
        results.push({
          path: route.path,
          expectedStatus: route.expectedStatus,
          receivedStatus: response.status,
          passed: false,
          message: route.invalidBodyMessage ?? 'El cuerpo de la respuesta no es válido.',
        });
        continue;
      }

      results.push({
        path: route.path,
        expectedStatus: route.expectedStatus,
        receivedStatus: response.status,
        passed: true,
      });
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'AbortError'
          ? `Timeout después de ${timeoutMs} ms.`
          : 'Error de red o de lectura de respuesta.';

      results.push({
        path: route.path,
        expectedStatus: route.expectedStatus,
        receivedStatus: null,
        passed: false,
        message,
      });
    }
  }

  return results;
}

export function formatSmokeResult(result: SmokeRouteResult): string {
  if (result.passed) {
    return `PASS ${result.path.padEnd(32)} ${result.receivedStatus}`;
  }

  const status = result.receivedStatus === null ? 'no response' : result.receivedStatus;
  return `FAIL ${result.path.padEnd(32)} Expected: ${result.expectedStatus}; Received: ${status}; ${result.message ?? ''}`;
}
