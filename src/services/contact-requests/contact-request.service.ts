import 'server-only';

import * as contactRequestRepository from '@/repositories/contact-requests/contact-request.repository';
import * as editorialServiceRepository from '@/repositories/editorial-services/editorial-service.repository';
import { createContactRequestService } from './contact-request.service.core';

export { createContactRequestService } from './contact-request.service.core';
export type {
  ContactRequestAdminDetail,
  ContactRequestAdminFilters,
  ContactRequestAdminListItem,
  ContactRequestAdminListOptions,
  ContactRequestCounts,
  ContactRequestRepository,
  ContactRequestServiceSummary,
} from './contact-request.types';

const contactRequestService = createContactRequestService(
  contactRequestRepository,
  editorialServiceRepository,
);

export const {
  getContactRequestById,
  listContactRequests,
  getContactRequestCounts,
  createContactRequest,
  deleteContactRequestPermanently,
  updateContactRequest,
  updateContactRequestStatus,
  updateContactRequestInternalNotes,
  markContactRequestEmailNotificationSent,
  markContactRequestEmailNotificationFailed,
} = contactRequestService;
