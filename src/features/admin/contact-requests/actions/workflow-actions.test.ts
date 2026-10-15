import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  requireEditorialStaff: vi.fn(),
  requireAdmin: vi.fn(),
  transitionStatus: vi.fn(),
  addNote: vi.fn(),
  createStatus: vi.fn(),
  updateStatusDefinition: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
  requireAdmin: mocks.requireAdmin,
}));
vi.mock('@/services/contact-requests/contact-request-workflow.service', () => ({
  transitionStatus: mocks.transitionStatus,
  addNote: mocks.addNote,
  createStatus: mocks.createStatus,
  updateStatusDefinition: mocks.updateStatusDefinition,
}));

const { transitionContactRequestStatusAction } =
  await import('./transition-contact-request-status');
const { addContactRequestNoteAction } = await import('./add-contact-request-note');
const { createContactRequestStatusAction, updateContactRequestStatusAction } =
  await import('./manage-contact-request-statuses');

const requestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

describe('contact request workflow actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.requireAdmin.mockResolvedValue({ role: 'admin' });
  });

  it('authorizes staff before transitioning and invalidates the CRM and analytics', async () => {
    const formData = new FormData();
    formData.set('newStatus', 'no_answer');

    await transitionContactRequestStatusAction(requestId, formData);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.transitionStatus).toHaveBeenCalledWith({
      contactRequestId: requestId,
      newStatus: 'no_answer',
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/contact-requests/analytics');
  });

  it('creates separate notes through the workflow service, without legacy fields', async () => {
    const formData = new FormData();
    formData.set('body', 'Llamar mañana');

    await addContactRequestNoteAction(requestId, formData);

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.addNote).toHaveBeenCalledWith({
      contactRequestId: requestId,
      body: 'Llamar mañana',
    });
  });

  it('requires admin for catalog creation and selects the classification only at creation', async () => {
    const formData = new FormData();
    formData.set('key', 'waiting_for_reply');
    formData.set('label', 'Esperando respuesta');
    formData.set('classification', 'open');
    formData.set('sortOrder', '45');

    await createContactRequestStatusAction(formData);

    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.createStatus).toHaveBeenCalledWith({
      key: 'waiting_for_reply',
      label: 'Esperando respuesta',
      classification: 'open',
      sortOrder: 45,
    });
  });

  it('does not accept classification changes when editing a status', async () => {
    const formData = new FormData();
    formData.set('label', 'Etiqueta actualizada');
    formData.set('sortOrder', '55');
    formData.set('classification', 'won');

    await updateContactRequestStatusAction('waiting_for_reply', formData);

    expect(mocks.updateStatusDefinition).toHaveBeenCalledWith('waiting_for_reply', {
      label: 'Etiqueta actualizada',
      sortOrder: 55,
      isActive: false,
    });
    expect(mocks.updateStatusDefinition.mock.calls[0]?.[1]).not.toHaveProperty('classification');
  });
});
