import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { EditorialService } from '@/db/schema';
import {
  EditorialServiceNotFoundError,
  EditorialServiceSlugConflictError,
} from './editorial-service.errors';
import { createEditorialServiceService } from './editorial-service.service.core';
import type { EditorialServiceRepository } from './editorial-service.types';

type MockEditorialServiceRepository = {
  [Key in keyof EditorialServiceRepository]: Mock<EditorialServiceRepository[Key]>;
};

const serviceId = 'f3f6a49f-c418-4522-b311-a70b88aab7f4';

const baseService: EditorialService = {
  id: serviceId,
  name: 'Corrección de manuscrito',
  slug: 'correccion-de-manuscrito',
  shortDescription: null,
  description: null,
  isPublished: false,
  isFeatured: false,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function createRepositoryMock(): MockEditorialServiceRepository {
  return {
    findById: vi.fn<EditorialServiceRepository['findById']>(),
    findBySlug: vi.fn<EditorialServiceRepository['findBySlug']>(),
    findAll: vi.fn<EditorialServiceRepository['findAll']>(),
    findAllPaginated: vi.fn<EditorialServiceRepository['findAllPaginated']>(),
    findActive: vi.fn<EditorialServiceRepository['findActive']>(),
    findArchived: vi.fn<EditorialServiceRepository['findArchived']>(),
    findPublished: vi.fn<EditorialServiceRepository['findPublished']>(),
    existsBySlug: vi.fn<EditorialServiceRepository['existsBySlug']>(),
    create: vi.fn<EditorialServiceRepository['create']>(),
    update: vi.fn<EditorialServiceRepository['update']>(),
    archive: vi.fn<EditorialServiceRepository['archive']>(),
    restore: vi.fn<EditorialServiceRepository['restore']>(),
  };
}

describe('createEditorialServiceService', () => {
  let repository: MockEditorialServiceRepository;
  let service: ReturnType<typeof createEditorialServiceService>;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = createEditorialServiceService(repository);
  });

  it('creates a service with normalized input and generated slug', async () => {
    repository.existsBySlug.mockResolvedValue(false);
    repository.create.mockResolvedValue(baseService);

    await expect(
      service.createService({
        name: ' Corrección de manuscrito ',
        slug: '',
        shortDescription: '',
        description: '',
        isPublished: true,
        isFeatured: true,
        sortOrder: '2',
      }),
    ).resolves.toBe(baseService);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Corrección de manuscrito',
      slug: 'correccion-de-manuscrito',
      shortDescription: null,
      description: null,
      isPublished: true,
      isFeatured: true,
      sortOrder: 2,
    });
  });

  it('rejects slug conflicts when creating', async () => {
    repository.existsBySlug.mockResolvedValue(true);

    await expect(
      service.createService({
        name: 'Corrección de manuscrito',
        slug: 'correccion-de-manuscrito',
      }),
    ).rejects.toBeInstanceOf(EditorialServiceSlugConflictError);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('updates a service and checks slug conflicts against other records', async () => {
    const updatedService = { ...baseService, name: 'Nuevo servicio' };
    repository.findById.mockResolvedValue(baseService);
    repository.existsBySlug.mockResolvedValue(false);
    repository.update.mockResolvedValue(updatedService);

    await expect(
      service.updateService(serviceId, {
        name: ' Nuevo servicio ',
        slug: 'nuevo-servicio',
        isPublished: true,
      }),
    ).resolves.toBe(updatedService);

    expect(repository.existsBySlug).toHaveBeenCalledWith('nuevo-servicio', serviceId);
    expect(repository.update).toHaveBeenCalledWith(serviceId, {
      name: 'Nuevo servicio',
      slug: 'nuevo-servicio',
      isPublished: true,
    });
  });

  it('does not regenerate slug when updating only the name', async () => {
    repository.findById.mockResolvedValue(baseService);
    repository.update.mockResolvedValue({ ...baseService, name: 'Nuevo nombre' });

    await service.updateService(serviceId, {
      name: 'Nuevo nombre',
      slug: '',
    });

    expect(repository.existsBySlug).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(serviceId, {
      name: 'Nuevo nombre',
    });
  });

  it('lists active, archived and published services', async () => {
    const publicItem = {
      id: baseService.id,
      name: baseService.name,
      slug: baseService.slug,
      shortDescription: baseService.shortDescription,
      description: baseService.description,
      isFeatured: baseService.isFeatured,
    };
    repository.findAll.mockResolvedValue([baseService]);
    repository.findActive.mockResolvedValue([baseService]);
    repository.findArchived.mockResolvedValue([{ ...baseService, isArchived: true }]);
    repository.findPublished.mockResolvedValue([publicItem]);

    await expect(service.listServices()).resolves.toEqual([baseService]);
    expect(repository.findAll).toHaveBeenCalledWith('active', undefined);
    await expect(service.listActiveServices()).resolves.toEqual([baseService]);
    await expect(service.listArchivedServices()).resolves.toEqual([
      expect.objectContaining({ isArchived: true }),
    ]);
    await expect(service.listPublishedServices()).resolves.toEqual([publicItem]);
  });

  it('delegates paginated listing to the repository', async () => {
    const result = {
      items: [baseService],
      totalItems: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    repository.findAllPaginated.mockResolvedValue(result);

    await expect(
      service.listServicesPaginated('active', {
        query: 'correccion',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toBe(result);
    expect(repository.findAllPaginated).toHaveBeenCalledWith('active', {
      query: 'correccion',
      page: 1,
      pageSize: 20,
    });
  });

  it('archives and restores services idempotently', async () => {
    const archivedService = { ...baseService, isArchived: true, archivedAt: new Date() };
    repository.findById.mockResolvedValueOnce(baseService).mockResolvedValueOnce(archivedService);
    repository.archive.mockResolvedValue(archivedService);

    await expect(service.archiveService(serviceId)).resolves.toBe(archivedService);
    await expect(service.archiveService(serviceId)).resolves.toBe(archivedService);
    expect(repository.archive).toHaveBeenCalledTimes(1);

    repository.findById.mockResolvedValueOnce(archivedService).mockResolvedValueOnce(baseService);
    repository.restore.mockResolvedValue(baseService);

    await expect(service.restoreService(serviceId)).resolves.toBe(baseService);
    await expect(service.restoreService(serviceId)).resolves.toBe(baseService);
    expect(repository.restore).toHaveBeenCalledTimes(1);
  });

  it('throws EditorialServiceNotFoundError for unknown services', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getServiceById(serviceId)).rejects.toBeInstanceOf(
      EditorialServiceNotFoundError,
    );
  });
});
