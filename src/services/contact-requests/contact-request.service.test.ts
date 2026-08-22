import { beforeEach, describe, expect, it } from 'vitest';

import type { ContactRequest, EditorialService } from '@/db/schema';
import { createPaginatedResult } from '@/features/admin/lib/list-query';
import type {
  ContactRequestSource,
  ContactRequestStatus,
  CreateContactRequestInput,
  UpdateContactRequestAdminInput,
} from '@/schemas/contact-requests/contact-request.schema';
import type { EditorialServiceRepository } from '@/services/editorial-services/editorial-service.types';
import {
  ContactRequestInvalidServiceError,
  ContactRequestNotFoundError,
} from './contact-request.errors';
import { createContactRequestService } from './contact-request.service.core';
import type {
  ContactRequestAdminDetail,
  ContactRequestAdminFilters,
  ContactRequestAdminListOptions,
  ContactRequestRepository,
} from './contact-request.types';

const serviceId = 'f3f6a49f-c418-4522-b311-a70b88aab7f4';
const alternateServiceId = 'c89ff281-8f18-4c90-b4b6-ec7de7414103';
const contactRequestId = '45aa8657-bf26-4b62-bc01-8ba7570d7bbb';

const activeService: EditorialService = {
  id: serviceId,
  name: 'Corrección de manuscrito',
  slug: 'correccion-de-manuscrito',
  shortDescription: 'Revisión profesional.',
  description: null,
  isPublished: true,
  isFeatured: false,
  isArchived: false,
  archivedAt: null,
  sortOrder: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const alternateService: EditorialService = {
  ...activeService,
  id: alternateServiceId,
  name: 'Maquetación editorial',
  slug: 'maquetacion-editorial',
};

const baseContactRequest: ContactRequest = {
  id: contactRequestId,
  name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+34 600 111 222',
  province: 'Madrid',
  serviceId,
  message: 'Quiero publicar mi libro con acompañamiento editorial.',
  status: 'new',
  source: 'website',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  utmTerm: null,
  emailSentAt: null,
  emailError: null,
  internalNotes: null,
  createdAt: new Date('2026-02-01T10:00:00.000Z'),
  updatedAt: new Date('2026-02-01T10:00:00.000Z'),
};

function toDetail(contactRequest: ContactRequest): ContactRequestAdminDetail {
  const service =
    contactRequest.serviceId === alternateServiceId ? alternateService : activeService;

  return {
    ...contactRequest,
    status: contactRequest.status as ContactRequestStatus,
    source: contactRequest.source as ContactRequestSource,
    service: {
      id: service.id,
      name: service.name,
      slug: service.slug,
    },
  };
}

function createFakeRepositories() {
  const services = new Map<string, EditorialService>([
    [activeService.id, activeService],
    [alternateService.id, alternateService],
  ]);
  const contactRequests = new Map<string, ContactRequest>([
    [baseContactRequest.id, baseContactRequest],
  ]);
  let createCount = 0;
  let lastListOptions: ContactRequestAdminListOptions | null = null;
  let lastCountsFilters: ContactRequestAdminFilters | undefined;

  async function updateContactRequestRecord(
    id: string,
    input: UpdateContactRequestAdminInput &
      Partial<Pick<ContactRequest, 'emailSentAt' | 'emailError'>>,
  ): Promise<ContactRequestAdminDetail | null> {
    const contactRequest = contactRequests.get(id);

    if (!contactRequest) {
      return null;
    }

    const updated: ContactRequest = {
      ...contactRequest,
      ...input,
      updatedAt: new Date('2026-03-02T10:00:00.000Z'),
    };
    contactRequests.set(id, updated);

    return toDetail(updated);
  }

  const contactRequestRepository: ContactRequestRepository = {
    async findById(id) {
      const contactRequest = contactRequests.get(id);

      return contactRequest ? toDetail(contactRequest) : null;
    },
    async findAllPaginated(options) {
      lastListOptions = options;

      return createPaginatedResult(
        Array.from(contactRequests.values()).map(toDetail),
        contactRequests.size,
        options.page,
        options.pageSize,
      );
    },
    async create(input: CreateContactRequestInput) {
      createCount += 1;
      const contactRequest: ContactRequest = {
        id: `00000000-0000-4000-8000-${String(createCount).padStart(12, '0')}`,
        name: input.name,
        email: input.email,
        phone: input.phone,
        province: input.province,
        serviceId: input.serviceId,
        message: input.message,
        status: 'new',
        source: input.source,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmContent: input.utmContent ?? null,
        utmTerm: input.utmTerm ?? null,
        emailSentAt: null,
        emailError: null,
        internalNotes: null,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
        updatedAt: new Date('2026-03-01T10:00:00.000Z'),
      };

      contactRequests.set(contactRequest.id, contactRequest);

      return contactRequest;
    },
    async update(id, input) {
      return updateContactRequestRecord(id, input);
    },
    async updateStatus(id, status) {
      return updateContactRequestRecord(id, { status });
    },
    async updateInternalNotes(id, internalNotes) {
      return updateContactRequestRecord(id, { internalNotes });
    },
    async markEmailNotificationSent(id, sentAt) {
      return updateContactRequestRecord(id, {
        emailSentAt: sentAt,
        emailError: null,
      });
    },
    async markEmailNotificationFailed(id, emailError) {
      return updateContactRequestRecord(id, {
        emailSentAt: null,
        emailError,
      });
    },
    async getCounts(filters) {
      lastCountsFilters = filters;

      return {
        total: contactRequests.size,
        new: Array.from(contactRequests.values()).filter((item) => item.status === 'new').length,
        inProgress: Array.from(contactRequests.values()).filter(
          (item) => item.status === 'in_progress',
        ).length,
        won: Array.from(contactRequests.values()).filter((item) => item.status === 'won').length,
      };
    },
  };

  const editorialServiceRepository: EditorialServiceRepository = {
    async findById(id) {
      return services.get(id) ?? null;
    },
    async findBySlug(slug) {
      return Array.from(services.values()).find((service) => service.slug === slug) ?? null;
    },
    async findAll() {
      return Array.from(services.values());
    },
    async findAllPaginated(status, options) {
      void status;

      return createPaginatedResult(
        Array.from(services.values()),
        services.size,
        options.page,
        options.pageSize,
      );
    },
    async findActive() {
      return Array.from(services.values()).filter((service) => !service.isArchived);
    },
    async findArchived() {
      return Array.from(services.values()).filter((service) => service.isArchived);
    },
    async findPublished() {
      return Array.from(services.values())
        .filter((service) => service.isPublished && !service.isArchived)
        .map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          shortDescription: service.shortDescription,
          description: service.description,
          isFeatured: service.isFeatured,
        }));
    },
    async existsBySlug() {
      return false;
    },
    async create(data) {
      const service = {
        ...activeService,
        ...data,
        id: '11111111-1111-4111-8111-111111111111',
      };
      services.set(service.id, service);

      return service;
    },
    async update(id, data) {
      const service = services.get(id);

      if (!service) {
        return null;
      }

      const updated = { ...service, ...data };
      services.set(id, updated);

      return updated;
    },
    async archive(id) {
      const service = services.get(id);

      if (!service) {
        return null;
      }

      const updated = { ...service, isArchived: true, archivedAt: new Date() };
      services.set(id, updated);

      return updated;
    },
    async restore(id) {
      const service = services.get(id);

      if (!service) {
        return null;
      }

      const updated = { ...service, isArchived: false, archivedAt: null };
      services.set(id, updated);

      return updated;
    },
  };

  return {
    contactRequestRepository,
    editorialServiceRepository,
    services,
    getLastListOptions: () => lastListOptions,
    getLastCountsFilters: () => lastCountsFilters,
    getCreateCount: () => createCount,
  };
}

describe('createContactRequestService', () => {
  let repositories: ReturnType<typeof createFakeRepositories>;

  beforeEach(() => {
    repositories = createFakeRepositories();
  });

  it('creates a contact request after validating an active published service', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );

    const created = await service.createContactRequest({
      name: 'Ana Pérez',
      email: 'ANA@EXAMPLE.COM',
      phone: '+34 600 111 222',
      province: 'Madrid',
      serviceId,
      message: 'Quiero publicar mi libro con acompañamiento editorial.',
      source: 'instagram',
    });

    expect(created).toMatchObject({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      status: 'new',
      source: 'instagram',
      emailSentAt: null,
      emailError: null,
    });
    expect(repositories.getCreateCount()).toBe(1);
  });

  it('rejects creation when the service does not exist or cannot receive leads', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );

    await expect(
      service.createContactRequest({
        name: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+34 600 111 222',
        province: 'Madrid',
        serviceId: '00000000-0000-4000-8000-000000000000',
        message: 'Quiero publicar mi libro con acompañamiento editorial.',
      }),
    ).rejects.toBeInstanceOf(ContactRequestInvalidServiceError);

    repositories.services.set(serviceId, {
      ...activeService,
      isPublished: false,
    });

    await expect(
      service.createContactRequest({
        name: 'Ana Pérez',
        email: 'ana@example.com',
        phone: '+34 600 111 222',
        province: 'Madrid',
        serviceId,
        message: 'Quiero publicar mi libro con acompañamiento editorial.',
      }),
    ).rejects.toBeInstanceOf(ContactRequestInvalidServiceError);
  });

  it('finds contact requests and throws a domain error for missing ids', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );

    await expect(service.getContactRequestById(contactRequestId)).resolves.toMatchObject({
      id: contactRequestId,
      service: {
        id: serviceId,
      },
    });
    await expect(
      service.getContactRequestById('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(ContactRequestNotFoundError);
  });

  it('updates status, internal notes and corrected service', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );

    await expect(
      service.updateContactRequest(contactRequestId, {
        status: 'in_progress',
        serviceId: alternateServiceId,
        internalNotes: 'Llamar el jueves',
      }),
    ).resolves.toMatchObject({
      status: 'in_progress',
      serviceId: alternateServiceId,
      internalNotes: 'Llamar el jueves',
    });

    await expect(
      service.updateContactRequestStatus(contactRequestId, 'won'),
    ).resolves.toMatchObject({
      status: 'won',
    });
    await expect(
      service.updateContactRequestInternalNotes(contactRequestId, null),
    ).resolves.toMatchObject({
      internalNotes: null,
    });
  });

  it('marks email notification sent and failed states', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );
    const sentAt = new Date('2026-08-20T10:00:00.000Z');

    await expect(
      service.markContactRequestEmailNotificationSent(contactRequestId, sentAt),
    ).resolves.toMatchObject({
      emailSentAt: sentAt,
      emailError: null,
    });

    await expect(
      service.markContactRequestEmailNotificationFailed(
        contactRequestId,
        'SMTP connection timeout'.repeat(30),
      ),
    ).resolves.toMatchObject({
      emailSentAt: null,
      emailError: expect.stringMatching(/^SMTP connection timeout/),
    });
  });

  it('passes filtering and pagination options to the repository', async () => {
    const service = createContactRequestService(
      repositories.contactRequestRepository,
      repositories.editorialServiceRepository,
    );
    const filters = {
      query: 'ana',
      status: 'new' as const,
      serviceId,
      source: 'website' as const,
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
      dateTo: new Date('2026-01-31T23:59:59.999Z'),
    };

    await service.listContactRequests({
      filters,
      page: 2,
      pageSize: 50,
    });
    await service.getContactRequestCounts(filters);

    expect(repositories.getLastListOptions()).toEqual({
      filters,
      page: 2,
      pageSize: 50,
    });
    expect(repositories.getLastCountsFilters()).toEqual(filters);
  });
});
