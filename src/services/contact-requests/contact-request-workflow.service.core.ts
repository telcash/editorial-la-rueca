import { z } from 'zod';

import {
  createContactRequestNoteSchema,
  createContactRequestStatusSchema,
  transitionContactRequestStatusSchema,
  updateContactRequestStatusDefinitionSchema,
} from '@/schemas/contact-requests/contact-request-workflow.schema';
import {
  ContactRequestStatusConflictError,
  ContactRequestInitialStatusCannotBeDeactivatedError,
  ContactRequestStatusNotFoundError,
  ContactRequestWorkflowRequestNotFoundError,
} from './contact-request-workflow.errors';
import type { ContactRequestWorkflowRepository } from './contact-request-workflow.types';

const requestIdSchema = z.string().uuid();
const statusKeySchema = createContactRequestStatusSchema.shape.key;

export function createContactRequestWorkflowService(repository: ContactRequestWorkflowRepository) {
  return {
    async listStatuses(options: { includeInactive?: boolean } = {}) {
      return repository.findStatuses(options.includeInactive ?? true);
    },

    async listStatusesForFilters() {
      return repository.findStatusesForFilters();
    },

    async getStatus(key: string) {
      const validKey = statusKeySchema.parse(key);
      const status = await repository.findStatusByKey(validKey);

      if (!status) {
        throw new ContactRequestStatusNotFoundError(validKey);
      }

      return status;
    },

    async createStatus(input: unknown) {
      return repository.createStatus(createContactRequestStatusSchema.parse(input));
    },

    async updateStatusDefinition(key: string, input: unknown) {
      const validKey = statusKeySchema.parse(key);
      const data = updateContactRequestStatusDefinitionSchema.parse(input);

      if (validKey === 'new' && data.isActive === false) {
        throw new ContactRequestInitialStatusCannotBeDeactivatedError();
      }

      const status = await repository.updateStatusDefinition(validKey, data);

      if (!status) {
        throw new ContactRequestStatusNotFoundError(validKey);
      }

      return status;
    },

    async addNote(input: unknown, authorProfileId: string) {
      const data = createContactRequestNoteSchema.parse(input);
      const validAuthorProfileId = z.string().uuid().parse(authorProfileId);
      const currentStatus = await repository.findCurrentStatus(data.contactRequestId);

      if (currentStatus === null) {
        throw new ContactRequestWorkflowRequestNotFoundError(data.contactRequestId);
      }

      return repository.createNote({
        ...data,
        authorProfileId: validAuthorProfileId,
      });
    },

    async listNotes(contactRequestId: string) {
      const validId = requestIdSchema.parse(contactRequestId);
      return repository.findNotes(validId);
    },

    async transitionStatus(input: unknown, changedByProfileId: string) {
      const data = transitionContactRequestStatusSchema.parse(input);
      const validActorId = z.string().uuid().parse(changedByProfileId);
      const targetStatus = await repository.findStatusByKey(data.newStatus);

      if (!targetStatus || !targetStatus.isActive) {
        throw new ContactRequestStatusNotFoundError(data.newStatus);
      }

      const previousStatus = await repository.findCurrentStatus(data.contactRequestId);

      if (previousStatus === null) {
        throw new ContactRequestWorkflowRequestNotFoundError(data.contactRequestId);
      }

      if (previousStatus === data.newStatus) {
        return null;
      }

      const historyEntry = await repository.transitionStatus({
        contactRequestId: data.contactRequestId,
        previousStatus,
        newStatus: data.newStatus,
        changedByProfileId: validActorId,
      });

      if (!historyEntry) {
        const currentStatus = await repository.findCurrentStatus(data.contactRequestId);

        if (currentStatus === null) {
          throw new ContactRequestWorkflowRequestNotFoundError(data.contactRequestId);
        }

        throw new ContactRequestStatusConflictError(data.contactRequestId);
      }

      return historyEntry;
    },

    async listStatusHistory(contactRequestId: string) {
      const validId = requestIdSchema.parse(contactRequestId);
      return repository.findStatusHistory(validId);
    },
  };
}
