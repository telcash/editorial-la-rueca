import { z } from 'zod';

import {
  contactRequestStatusSchema,
  createContactRequestSchema,
  updateContactRequestAdminSchema,
  type ContactRequestStatus,
  type CreateContactRequestInput,
  type UpdateContactRequestAdminInput,
} from '@/schemas/contact-requests/contact-request.schema';
import type { EditorialServiceRepository } from '@/services/editorial-services/editorial-service.types';
import {
  ContactRequestInvalidServiceError,
  ContactRequestNotFoundError,
} from './contact-request.errors';
import type {
  ContactRequestAdminListOptions,
  ContactRequestRepository,
} from './contact-request.types';

const contactRequestIdSchema = z.string().uuid('El id de la solicitud debe ser un UUID valido.');

async function assertServiceCanReceiveLeads(
  repository: EditorialServiceRepository,
  serviceId: string,
) {
  const service = await repository.findById(serviceId);

  if (!service || service.isArchived || !service.isPublished) {
    throw new ContactRequestInvalidServiceError(serviceId);
  }
}

export function createContactRequestService(
  contactRequestRepository: ContactRequestRepository,
  editorialServiceRepository: EditorialServiceRepository,
) {
  return {
    async getContactRequestById(id: string) {
      const validId = contactRequestIdSchema.parse(id);
      const contactRequest = await contactRequestRepository.findById(validId);

      if (!contactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return contactRequest;
    },

    async listContactRequests(options: ContactRequestAdminListOptions) {
      return contactRequestRepository.findAllPaginated(options);
    },

    async getContactRequestCounts(options?: ContactRequestAdminListOptions['filters']) {
      return contactRequestRepository.getCounts(options);
    },

    async createContactRequest(input: unknown) {
      const data: CreateContactRequestInput = createContactRequestSchema.parse(input);

      await assertServiceCanReceiveLeads(editorialServiceRepository, data.serviceId);

      // Future email notifications must be attempted only after this insert succeeds.
      return contactRequestRepository.create(data);
    },

    async deleteContactRequestPermanently(id: string) {
      const validId = contactRequestIdSchema.parse(id);
      const deletedContactRequest = await contactRequestRepository.deleteById(validId);

      if (!deletedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return deletedContactRequest;
    },

    async updateContactRequest(id: string, input: unknown) {
      const validId = contactRequestIdSchema.parse(id);
      const data: UpdateContactRequestAdminInput = updateContactRequestAdminSchema.parse(input);
      const currentContactRequest = await contactRequestRepository.findById(validId);

      if (!currentContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      if (data.serviceId && data.serviceId !== currentContactRequest.serviceId) {
        await assertServiceCanReceiveLeads(editorialServiceRepository, data.serviceId);
      }

      const updatedContactRequest = await contactRequestRepository.update(validId, data);

      if (!updatedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return updatedContactRequest;
    },

    async updateContactRequestStatus(id: string, status: unknown) {
      const validId = contactRequestIdSchema.parse(id);
      const validStatus: ContactRequestStatus = contactRequestStatusSchema.parse(status);
      const currentContactRequest = await contactRequestRepository.findById(validId);

      if (!currentContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      const updatedContactRequest = await contactRequestRepository.updateStatus(
        validId,
        validStatus,
      );

      if (!updatedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return updatedContactRequest;
    },

    async updateContactRequestInternalNotes(id: string, internalNotes: string | null) {
      const validId = contactRequestIdSchema.parse(id);
      const currentContactRequest = await contactRequestRepository.findById(validId);

      if (!currentContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      const updatedContactRequest = await contactRequestRepository.updateInternalNotes(
        validId,
        internalNotes,
      );

      if (!updatedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return updatedContactRequest;
    },

    async markContactRequestEmailNotificationSent(id: string, sentAt: Date) {
      const validId = contactRequestIdSchema.parse(id);
      const updatedContactRequest = await contactRequestRepository.markEmailNotificationSent(
        validId,
        sentAt,
      );

      if (!updatedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return updatedContactRequest;
    },

    async markContactRequestEmailNotificationFailed(id: string, emailError: string) {
      const validId = contactRequestIdSchema.parse(id);
      const safeEmailError = emailError.trim().slice(0, 500);
      const updatedContactRequest = await contactRequestRepository.markEmailNotificationFailed(
        validId,
        safeEmailError || 'Email notification failed.',
      );

      if (!updatedContactRequest) {
        throw new ContactRequestNotFoundError(validId);
      }

      return updatedContactRequest;
    },
  };
}
