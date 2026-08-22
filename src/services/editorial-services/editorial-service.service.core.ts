import { z } from 'zod';

import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import {
  createServiceSchema,
  serviceSlugSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '@/schemas/editorial-services/editorial-service.schema';
import {
  EditorialServiceNotFoundError,
  EditorialServiceSlugConflictError,
} from './editorial-service.errors';
import type { EditorialServiceRepository } from './editorial-service.types';

const serviceIdSchema = z.string().uuid('El id del servicio debe ser un UUID valido.');

export function createEditorialServiceService(repository: EditorialServiceRepository) {
  return {
    async getServiceById(id: string) {
      const validId = serviceIdSchema.parse(id);
      const service = await repository.findById(validId);

      if (!service) {
        throw new EditorialServiceNotFoundError(validId);
      }

      return service;
    },

    async getServiceBySlug(slug: string) {
      const validSlug = serviceSlugSchema.parse(slug);
      const service = await repository.findBySlug(validSlug);

      if (!service) {
        throw new EditorialServiceNotFoundError(validSlug);
      }

      return service;
    },

    async listServices(
      status: ArchiveStatus = 'active',
      options?: Parameters<EditorialServiceRepository['findAll']>[1],
    ) {
      return repository.findAll(status, options);
    },

    async listServicesPaginated(
      status: ArchiveStatus = 'active',
      options: Parameters<EditorialServiceRepository['findAllPaginated']>[1],
    ) {
      return repository.findAllPaginated(status, options);
    },

    async listActiveServices() {
      return repository.findActive();
    },

    async listArchivedServices() {
      return repository.findArchived();
    },

    async listPublishedServices() {
      return repository.findPublished();
    },

    async createService(input: unknown) {
      const data: CreateServiceInput = createServiceSchema.parse(input);
      const slugExists = await repository.existsBySlug(data.slug);

      if (slugExists) {
        throw new EditorialServiceSlugConflictError(data.slug);
      }

      return repository.create(data);
    },

    async updateService(id: string, input: unknown) {
      const validId = serviceIdSchema.parse(id);
      const data: UpdateServiceInput = updateServiceSchema.parse(input);
      const currentService = await repository.findById(validId);

      if (!currentService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      if (data.slug && data.slug !== currentService.slug) {
        const slugExists = await repository.existsBySlug(data.slug, validId);

        if (slugExists) {
          throw new EditorialServiceSlugConflictError(data.slug);
        }
      }

      const updatedService = await repository.update(validId, data);

      if (!updatedService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      return updatedService;
    },

    async archiveService(id: string) {
      const validId = serviceIdSchema.parse(id);
      const currentService = await repository.findById(validId);

      if (!currentService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      if (currentService.isArchived) {
        return currentService;
      }

      const archivedService = await repository.archive(validId);

      if (!archivedService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      return archivedService;
    },

    async restoreService(id: string) {
      const validId = serviceIdSchema.parse(id);
      const currentService = await repository.findById(validId);

      if (!currentService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      if (!currentService.isArchived) {
        return currentService;
      }

      const restoredService = await repository.restore(validId);

      if (!restoredService) {
        throw new EditorialServiceNotFoundError(validId);
      }

      return restoredService;
    },
  };
}
