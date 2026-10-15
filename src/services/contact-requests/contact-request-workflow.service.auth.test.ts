import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  requireEditorialStaff: vi.fn(),
  listStatuses: vi.fn(),
  listStatusesForFilters: vi.fn(),
  findStatusByKey: vi.fn(),
  findCurrentStatus: vi.fn(),
  createStatus: vi.fn(),
  updateStatusDefinition: vi.fn(),
  createNote: vi.fn(),
  transitionStatus: vi.fn(),
}));
const staffId = 'c81c0c79-e11b-4a57-91d4-846224e6f5b8';

vi.mock('@/services/auth/access.service', () => ({
  requireAdmin: mocks.requireAdmin,
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/repositories/contact-requests/contact-request-workflow.repository', () => ({
  findStatuses: mocks.listStatuses,
  findStatusesForFilters: mocks.listStatusesForFilters,
  findStatusByKey: mocks.findStatusByKey,
  createStatus: mocks.createStatus,
  updateStatusDefinition: mocks.updateStatusDefinition,
  findCurrentStatus: mocks.findCurrentStatus,
  createNote: mocks.createNote,
  findNotes: vi.fn(),
  transitionStatus: mocks.transitionStatus,
  findStatusHistory: vi.fn(),
}));

const workflow = await import('./contact-request-workflow.service');

describe('contact request workflow service authorization boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires admin for status catalog writes', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('unauthorized'));

    await expect(
      workflow.createStatus({
        key: 'custom_stage',
        label: 'Etapa',
        classification: 'open',
      }),
    ).rejects.toThrow('unauthorized');
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.createStatus).not.toHaveBeenCalled();
  });

  it('derives the note author from the authenticated editorial user', async () => {
    mocks.requireEditorialStaff.mockResolvedValue({ userId: staffId });
    mocks.createNote.mockResolvedValue({ id: 'note-id' });

    await workflow.addNote({
      contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
      body: 'Seguimiento',
    });

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.createNote).toHaveBeenCalledWith({
      contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
      body: 'Seguimiento',
      authorProfileId: staffId,
    });
  });

  it('derives the transition actor from the authenticated editorial user', async () => {
    mocks.requireEditorialStaff.mockResolvedValue({ userId: staffId });
    mocks.transitionStatus.mockResolvedValue({ id: 'event-id' });
    mocks.findStatusByKey.mockResolvedValue({ key: 'no_answer', isActive: true });
    mocks.findCurrentStatus.mockResolvedValue('new');

    await workflow.transitionStatus({
      contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
      newStatus: 'no_answer',
    });

    expect(mocks.requireEditorialStaff).toHaveBeenCalledOnce();
    expect(mocks.transitionStatus).toHaveBeenCalledWith({
      contactRequestId: 'a70a07da-a885-4cec-866e-a2063cd063a8',
      previousStatus: 'new',
      newStatus: 'no_answer',
      changedByProfileId: staffId,
    });
  });
});
