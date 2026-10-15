import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContactRequestWorkflowRepository } from './contact-request-workflow.types';
import {
  ContactRequestStatusConflictError,
  ContactRequestInitialStatusCannotBeDeactivatedError,
  ContactRequestStatusNotFoundError,
  ContactRequestWorkflowRequestNotFoundError,
} from './contact-request-workflow.errors';
import { createContactRequestWorkflowService } from './contact-request-workflow.service.core';

const requestId = 'a70a07da-a885-4cec-866e-a2063cd063a8';
const actorId = 'c81c0c79-e11b-4a57-91d4-846224e6f5b8';
const status = {
  key: 'no_answer',
  label: 'No contesta',
  classification: 'open' as const,
  sortOrder: 40,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function makeRepository() {
  return {
    findStatuses: vi.fn<ContactRequestWorkflowRepository['findStatuses']>(),
    findStatusesForFilters: vi.fn<ContactRequestWorkflowRepository['findStatusesForFilters']>(),
    findStatusByKey: vi.fn<ContactRequestWorkflowRepository['findStatusByKey']>(),
    createStatus: vi.fn<ContactRequestWorkflowRepository['createStatus']>(),
    updateStatusDefinition: vi.fn<ContactRequestWorkflowRepository['updateStatusDefinition']>(),
    findCurrentStatus: vi.fn<ContactRequestWorkflowRepository['findCurrentStatus']>(),
    createNote: vi.fn<ContactRequestWorkflowRepository['createNote']>(),
    findNotes: vi.fn<ContactRequestWorkflowRepository['findNotes']>(),
    transitionStatus: vi.fn<ContactRequestWorkflowRepository['transitionStatus']>(),
    findStatusHistory: vi.fn<ContactRequestWorkflowRepository['findStatusHistory']>(),
  } satisfies ContactRequestWorkflowRepository;
}

describe('contact request workflow service', () => {
  const repository = makeRepository();
  const service = createContactRequestWorkflowService(repository);

  beforeEach(() => vi.clearAllMocks());

  it('includes inactive statuses by default so historical state labels remain resolvable', async () => {
    repository.findStatuses.mockResolvedValue([]);

    await service.listStatuses();

    expect(repository.findStatuses).toHaveBeenCalledWith(true);
  });

  it('keeps notes as separate immutable repository inserts', async () => {
    const firstNote = { id: 'note-1' } as never;
    const secondNote = { id: 'note-2' } as never;
    repository.findCurrentStatus.mockResolvedValue('new');
    repository.createNote.mockResolvedValueOnce(firstNote).mockResolvedValueOnce(secondNote);

    await expect(
      service.addNote({ contactRequestId: requestId, body: 'Primera nota' }, actorId),
    ).resolves.toBe(firstNote);
    await expect(
      service.addNote({ contactRequestId: requestId, body: 'Segunda nota' }, actorId),
    ).resolves.toBe(secondNote);

    expect(repository.createNote).toHaveBeenNthCalledWith(1, {
      contactRequestId: requestId,
      body: 'Primera nota',
      authorProfileId: actorId,
    });
    expect(repository.createNote).toHaveBeenNthCalledWith(2, {
      contactRequestId: requestId,
      body: 'Segunda nota',
      authorProfileId: actorId,
    });
  });

  it('does not add a note when its request no longer exists', async () => {
    repository.findCurrentStatus.mockResolvedValue(null);

    await expect(
      service.addNote({ contactRequestId: requestId, body: 'Nota tardía' }, actorId),
    ).rejects.toBeInstanceOf(ContactRequestWorkflowRequestNotFoundError);
    expect(repository.createNote).not.toHaveBeenCalled();
  });

  it('keeps the initial new status active', async () => {
    await expect(service.updateStatusDefinition('new', { isActive: false })).rejects.toBeInstanceOf(
      ContactRequestInitialStatusCannotBeDeactivatedError,
    );
    expect(repository.updateStatusDefinition).not.toHaveBeenCalled();
  });

  it('rejects transitions to an inactive status', async () => {
    repository.findStatusByKey.mockResolvedValue({ ...status, isActive: false });

    await expect(
      service.transitionStatus(
        {
          contactRequestId: requestId,
          newStatus: status.key,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ContactRequestStatusNotFoundError);
    expect(repository.findCurrentStatus).not.toHaveBeenCalled();
  });

  it('does not create an event when the requested status is already current', async () => {
    repository.findStatusByKey.mockResolvedValue(status);
    repository.findCurrentStatus.mockResolvedValue(status.key);

    await expect(
      service.transitionStatus(
        {
          contactRequestId: requestId,
          newStatus: status.key,
        },
        actorId,
      ),
    ).resolves.toBeNull();
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });

  it('delegates a changed status with the observed previous status and actor', async () => {
    const event = { id: 'event-1', previousStatus: 'new', newStatus: status.key };
    repository.findStatusByKey.mockResolvedValue(status);
    repository.findCurrentStatus.mockResolvedValue('new');
    repository.transitionStatus.mockResolvedValue(event as never);

    await expect(
      service.transitionStatus(
        {
          contactRequestId: requestId,
          newStatus: status.key,
        },
        actorId,
      ),
    ).resolves.toBe(event);
    expect(repository.transitionStatus).toHaveBeenCalledWith({
      contactRequestId: requestId,
      previousStatus: 'new',
      newStatus: status.key,
      changedByProfileId: actorId,
    });
  });

  it('distinguishes a missing request and a concurrent status update', async () => {
    repository.findStatusByKey.mockResolvedValue(status);
    repository.findCurrentStatus.mockResolvedValueOnce(null);
    await expect(
      service.transitionStatus(
        {
          contactRequestId: requestId,
          newStatus: status.key,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ContactRequestWorkflowRequestNotFoundError);

    repository.findCurrentStatus.mockResolvedValueOnce('new').mockResolvedValueOnce('contacted');
    repository.transitionStatus.mockResolvedValue(null);
    await expect(
      service.transitionStatus(
        {
          contactRequestId: requestId,
          newStatus: status.key,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ContactRequestStatusConflictError);
  });
});
