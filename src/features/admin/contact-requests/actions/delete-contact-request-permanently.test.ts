import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
  requireAdmin: vi.fn(),
  deleteContactRequestPermanently: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock('@/services/contact-requests/contact-request.service', () => ({
  deleteContactRequestPermanently: mocks.deleteContactRequestPermanently,
}));

const { deleteContactRequestPermanentlyAction } =
  await import('./delete-contact-request-permanently');

const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

describe('deleteContactRequestPermanentlyAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
    mocks.deleteContactRequestPermanently.mockResolvedValue({ id: contactRequestId });
  });

  it('authorizes before deleting', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('unauthorized'));

    await expect(
      deleteContactRequestPermanentlyAction(contactRequestId, 'ELIMINAR'),
    ).rejects.toThrow('unauthorized');
    expect(mocks.deleteContactRequestPermanently).not.toHaveBeenCalled();
  });

  it('requires the exact confirmation phrase', async () => {
    const result = await deleteContactRequestPermanentlyAction(contactRequestId, 'eliminar');

    expect(result).toEqual({
      success: false,
      message: 'Escribe ELIMINAR para confirmar la eliminación.',
    });
    expect(mocks.deleteContactRequestPermanently).not.toHaveBeenCalled();
  });

  it('deletes, revalidates CRM paths and redirects after success', async () => {
    await deleteContactRequestPermanentlyAction(contactRequestId, 'ELIMINAR');

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.deleteContactRequestPermanently).toHaveBeenCalledWith(contactRequestId);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/contact-requests');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/contact-requests/analytics');
    expect(mocks.redirect).toHaveBeenCalledWith(
      '/admin/contact-requests?feedback=contactRequestDeleted',
    );
  });
});
