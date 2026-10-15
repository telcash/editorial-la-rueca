import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireEditorialStaff: vi.fn(),
  updateContactRequest: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));
vi.mock('@/services/contact-requests/contact-request.service', () => ({
  updateContactRequest: mocks.updateContactRequest,
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

const actionModule = await import('./update-contact-request');
const { updateContactRequestServiceAction } = actionModule;

const requestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';
const previousState = {
  success: false,
  fieldErrors: {},
  formError: null,
  values: { serviceId: '' },
};

describe('updateContactRequestServiceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
  });

  it('exports only the service action name without matching the legacy WAF suffix', () => {
    expect(actionModule).not.toHaveProperty('updateContactRequestAction');
    expect(updateContactRequestServiceAction.name).toBe('updateContactRequestServiceAction');
    expect(
      `#${updateContactRequestServiceAction.name}`.endsWith('#updateContactRequestAction'),
    ).toBe(false);
  });

  it('rejects a stale form containing legacy status or notes without writing', async () => {
    const formData = new FormData();
    formData.set('status', 'won');
    formData.set('internalNotes', 'must not be written');

    const result = await updateContactRequestServiceAction(requestId, previousState, formData);

    expect(result.success).toBe(false);
    expect(result.formError).toContain('desactualizado');
    expect(mocks.updateContactRequest).not.toHaveBeenCalled();
  });

  it('allows editorial staff to update only the service association', async () => {
    const formData = new FormData();
    formData.set('serviceId', 'f3f6a49f-c418-4522-b311-a70b88aab7f4');

    await updateContactRequestServiceAction(requestId, previousState, formData);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.updateContactRequest).toHaveBeenCalledWith(requestId, {
      serviceId: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/contact-requests/analytics');
  });
});
