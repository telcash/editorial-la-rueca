import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { fetchMetaLead, MetaGraphApiError } = await import('./meta-lead-graph-client');

describe('fetchMetaLead', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requests Graph with a server-side bearer token and validates field_data', async () => {
    vi.stubEnv('META_LEAD_ACCESS_TOKEN', 'server-test-token');
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0');
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: 'lead-1',
        form_id: 'form-1',
        field_data: [{ name: 'email', values: ['a@example.com'] }],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchMetaLead('lead-1')).resolves.toMatchObject({
      id: 'lead-1',
      form_id: 'form-1',
    });
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain('/v99.0/lead-1');
    expect(url.searchParams.get('fields')).toBe('id,form_id,field_data');
    expect(options.headers).toEqual({ Authorization: 'Bearer server-test-token' });
  });

  it('does not expose Graph response bodies or credentials on failures', async () => {
    vi.stubEnv('META_LEAD_ACCESS_TOKEN', 'do-not-leak');
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('private error body', { status: 403 })),
    );

    await expect(fetchMetaLead('lead-1')).rejects.toBeInstanceOf(MetaGraphApiError);
    await expect(fetchMetaLead('lead-1')).rejects.not.toThrow('do-not-leak');
    await expect(fetchMetaLead('lead-1')).rejects.not.toThrow('private error body');
  });

  it('rejects invalid Graph response shapes and treats network timeout as a safe error', async () => {
    vi.stubEnv('META_LEAD_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('META_GRAPH_API_VERSION', 'v99.0');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 'lead-1', field_data: 'invalid' }))
      .mockRejectedValueOnce(new Error('timeout including test-token'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchMetaLead('lead-1')).rejects.toBeInstanceOf(MetaGraphApiError);
    const timeoutError = await fetchMetaLead('lead-1').catch((error: unknown) => error);
    expect(timeoutError).toBeInstanceOf(MetaGraphApiError);
    expect((timeoutError as Error).message).not.toContain('test-token');
  });

  it('fails closed on missing or malformed server configuration', async () => {
    vi.stubEnv('META_LEAD_ACCESS_TOKEN', '');
    vi.stubEnv('META_GRAPH_API_VERSION', 'latest');
    await expect(fetchMetaLead('lead-1')).rejects.toThrow('configuration is unavailable');
  });
});
