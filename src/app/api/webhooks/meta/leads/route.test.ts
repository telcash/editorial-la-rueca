import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  fetchMetaLead: vi.fn(),
  createAndNotifyContactRequest: vi.fn(),
}));

vi.mock('@/integrations/meta/meta-lead-graph-client', () => ({
  fetchMetaLead: mocks.fetchMetaLead,
  MetaGraphApiError: class MetaGraphApiError extends Error {
    constructor(readonly status: number | null) {
      super('Graph failed');
    }
  },
}));

vi.mock('@/services/contact-requests/create-and-notify-contact-request', () => ({
  createAndNotifyContactRequest: mocks.createAndNotifyContactRequest,
}));

const route = await import('./route');
const appSecret = 'test-app-secret';

function signedRequest(body: string, signatureBody = body): Request {
  const signature = createHmac('sha256', appSecret).update(signatureBody).digest('hex');
  return new Request('https://example.test/api/webhooks/meta/leads', {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${signature}` },
    body,
  });
}

describe('Meta leads webhook route', () => {
  beforeEach(() => {
    vi.stubEnv('META_WEBHOOK_VERIFY_TOKEN', 'verify-test-token');
    vi.stubEnv('META_APP_SECRET', appSecret);
    vi.clearAllMocks();
    mocks.fetchMetaLead.mockResolvedValue({
      id: 'lead-1',
      form_id: 'form-1',
      field_data: [
        { name: 'full_name', values: ['Ada Ruiz'] },
        { name: 'email', values: ['ada@example.com'] },
        { name: 'Pregunta nueva', values: ['Respuesta'] },
      ],
    });
    mocks.createAndNotifyContactRequest.mockResolvedValue({
      status: 'created',
      contactRequestId: 'request-1',
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it('verifies GET challenge and rejects invalid or incomplete verification', async () => {
    const accepted = await route.GET(
      new Request(
        'https://example.test/api/webhooks/meta/leads?hub.mode=subscribe&hub.verify_token=verify-test-token&hub.challenge=abc123',
      ),
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.text()).toBe('abc123');

    const wrongToken = await route.GET(
      new Request(
        'https://example.test/api/webhooks/meta/leads?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123',
      ),
    );
    expect(wrongToken.status).toBe(403);

    const wrongMode = await route.GET(
      new Request(
        'https://example.test/api/webhooks/meta/leads?hub.mode=unsubscribe&hub.verify_token=verify-test-token&hub.challenge=abc123',
      ),
    );
    expect(wrongMode.status).toBe(403);

    const missing = await route.GET(new Request('https://example.test/api/webhooks/meta/leads'));
    expect(missing.status).toBe(403);
  });

  it('authenticates raw body, fetches Graph and persists a normalized lead', async () => {
    const body = JSON.stringify({
      object: 'page',
      entry: [
        {
          changes: [
            { field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1' } },
            { field: 'feed', value: { irrelevant: true } },
          ],
        },
      ],
    });
    const response = await route.POST(signedRequest(body));

    expect(response.status).toBe(200);
    expect(mocks.fetchMetaLead).toHaveBeenCalledOnce();
    expect(mocks.fetchMetaLead).toHaveBeenCalledWith('lead-1');
    expect(mocks.createAndNotifyContactRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Ruiz',
        email: 'ada@example.com',
        source: 'meta_instant_form',
        serviceId: null,
        metaLeadId: 'lead-1',
        metaFormId: 'form-1',
        message: expect.stringContaining('Pregunta nueva'),
      }),
    );
  });

  it('rejects invalid signatures and malformed JSON before Graph or CRM', async () => {
    const invalidSignature = await route.POST(signedRequest('{"object":"page"}', 'different'));
    expect(invalidSignature.status).toBe(401);
    expect(mocks.fetchMetaLead).not.toHaveBeenCalled();

    const missingSignature = await route.POST(
      new Request('https://example.test/api/webhooks/meta/leads', {
        method: 'POST',
        body: '{"object":"page"}',
      }),
    );
    expect(missingSignature.status).toBe(401);

    const malformed = await route.POST(signedRequest('{not-json'));
    expect(malformed.status).toBe(400);
    expect(mocks.createAndNotifyContactRequest).not.toHaveBeenCalled();
  });

  it('rejects structurally invalid leadgen events without downstream calls', async () => {
    const body = JSON.stringify({
      object: 'page',
      entry: [{ changes: [{ field: 'leadgen', value: { form_id: 'form-without-lead-id' } }] }],
    });
    const response = await route.POST(signedRequest(body));
    expect(response.status).toBe(400);
    expect(mocks.fetchMetaLead).not.toHaveBeenCalled();
  });

  it('acknowledges unrelated webhook objects without calling Graph', async () => {
    const body = JSON.stringify({ object: 'instagram', entry: [] });
    const response = await route.POST(signedRequest(body));
    expect(response.status).toBe(200);
    expect(mocks.fetchMetaLead).not.toHaveBeenCalled();
  });

  it('processes multiple lead events and avoids duplicate Graph fetch within one batch', async () => {
    const body = JSON.stringify({
      object: 'page',
      entry: [
        {
          changes: [
            { field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1' } },
            { field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1' } },
            { field: 'leadgen', value: { leadgen_id: 'lead-2', form_id: 'form-2' } },
          ],
        },
      ],
    });
    mocks.fetchMetaLead.mockImplementation(async (id: string) => ({
      id,
      field_data: [
        { name: 'full_name', values: ['Ada Ruiz'] },
        { name: 'email', values: ['ada@example.com'] },
      ],
    }));

    const response = await route.POST(signedRequest(body));
    expect(response.status).toBe(200);
    expect(mocks.fetchMetaLead).toHaveBeenCalledTimes(2);
    expect(mocks.createAndNotifyContactRequest).toHaveBeenCalledTimes(2);
  });

  it('continues a batch past an unprocessable lead and does not invent missing identity', async () => {
    mocks.fetchMetaLead.mockImplementation(async (id: string) =>
      id === 'missing-email'
        ? {
            id,
            field_data: [{ name: 'full_name', values: ['Eva Ruiz'] }],
          }
        : {
            id,
            field_data: [
              { name: 'full_name', values: ['Ada Ruiz'] },
              { name: 'email', values: ['ada@example.com'] },
            ],
          },
    );
    const body = JSON.stringify({
      object: 'page',
      entry: [
        {
          changes: [
            { field: 'leadgen', value: { leadgen_id: 'missing-email', form_id: 'form-1' } },
            { field: 'leadgen', value: { leadgen_id: 'good-lead', form_id: 'form-1' } },
          ],
        },
      ],
    });

    const response = await route.POST(signedRequest(body));
    expect(response.status).toBe(422);
    expect(mocks.fetchMetaLead).toHaveBeenCalledTimes(2);
    expect(mocks.createAndNotifyContactRequest).toHaveBeenCalledOnce();
  });

  it('returns a retryable error when Graph fails before persistence', async () => {
    mocks.fetchMetaLead.mockRejectedValue(new Error('network error'));
    const body = JSON.stringify({
      object: 'page',
      entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1' } }] }],
    });
    const response = await route.POST(signedRequest(body));
    expect(response.status).toBe(503);
    expect(mocks.createAndNotifyContactRequest).not.toHaveBeenCalled();
  });
});
