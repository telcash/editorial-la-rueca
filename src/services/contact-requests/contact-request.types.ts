import type { ContactRequest, EditorialService } from '@/db/schema';
import type { PaginatedResult } from '@/features/admin/lib/list-query';
import type {
  ContactRequestSource,
  ContactRequestStatus,
  CreateContactRequestInput,
  UpdateContactRequestAdminInput,
} from '@/schemas/contact-requests/contact-request.schema';

export interface ContactRequestServiceSummary {
  id: EditorialService['id'];
  name: EditorialService['name'];
  slug: EditorialService['slug'];
}

export interface ContactRequestAdminListItem {
  id: ContactRequest['id'];
  name: ContactRequest['name'];
  email: ContactRequest['email'];
  phone: ContactRequest['phone'];
  province: ContactRequest['province'];
  status: ContactRequestStatus;
  source: ContactRequestSource;
  emailSentAt: ContactRequest['emailSentAt'];
  emailError: ContactRequest['emailError'];
  createdAt: ContactRequest['createdAt'];
  updatedAt: ContactRequest['updatedAt'];
  service: ContactRequestServiceSummary;
}

export type ContactRequestAdminDetail = ContactRequest & {
  status: ContactRequestStatus;
  source: ContactRequestSource;
  service: ContactRequestServiceSummary;
};

export interface ContactRequestAdminFilters {
  query?: string;
  status?: ContactRequestStatus | 'all';
  serviceId?: string;
  source?: ContactRequestSource | 'all';
  emailStatus?: 'all' | 'sent' | 'problem';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ContactRequestAdminListOptions {
  page: number;
  pageSize: number;
  filters?: ContactRequestAdminFilters;
}

export interface ContactRequestCounts {
  total: number;
  new: number;
  inProgress: number;
  won: number;
}

export interface ContactRequestRepository {
  findById(id: string): Promise<ContactRequestAdminDetail | null>;
  findAllPaginated(
    options: ContactRequestAdminListOptions,
  ): Promise<PaginatedResult<ContactRequestAdminListItem>>;
  create(input: CreateContactRequestInput): Promise<ContactRequest>;
  update(
    id: string,
    input: UpdateContactRequestAdminInput,
  ): Promise<ContactRequestAdminDetail | null>;
  updateStatus(id: string, status: ContactRequestStatus): Promise<ContactRequestAdminDetail | null>;
  updateInternalNotes(
    id: string,
    internalNotes: string | null,
  ): Promise<ContactRequestAdminDetail | null>;
  markEmailNotificationSent(id: string, sentAt: Date): Promise<ContactRequestAdminDetail | null>;
  markEmailNotificationFailed(
    id: string,
    emailError: string,
  ): Promise<ContactRequestAdminDetail | null>;
  getCounts(filters?: ContactRequestAdminFilters): Promise<ContactRequestCounts>;
}
