import type {
  ContactRequestNote,
  ContactRequestStatusDefinition,
  ContactRequestStatusHistoryEntry,
} from '@/db/schema';
import type {
  CreateContactRequestStatusInput,
  PersistContactRequestNoteInput,
  UpdateContactRequestStatusDefinitionInput,
} from '@/schemas/contact-requests/contact-request-workflow.schema';

export interface ContactRequestWorkflowRepository {
  findStatuses(includeInactive: boolean): Promise<ContactRequestStatusDefinition[]>;
  findStatusesForFilters(): Promise<ContactRequestStatusDefinition[]>;
  findStatusByKey(key: string): Promise<ContactRequestStatusDefinition | null>;
  createStatus(input: CreateContactRequestStatusInput): Promise<ContactRequestStatusDefinition>;
  updateStatusDefinition(
    key: string,
    input: UpdateContactRequestStatusDefinitionInput,
  ): Promise<ContactRequestStatusDefinition | null>;
  findCurrentStatus(contactRequestId: string): Promise<string | null>;
  createNote(input: PersistContactRequestNoteInput): Promise<ContactRequestNote>;
  findNotes(
    contactRequestId: string,
  ): Promise<Array<{ note: ContactRequestNote; authorName: string | null }>>;
  transitionStatus(input: {
    contactRequestId: string;
    previousStatus: string;
    newStatus: string;
    changedByProfileId: string;
  }): Promise<ContactRequestStatusHistoryEntry | null>;
  findStatusHistory(
    contactRequestId: string,
  ): Promise<Array<{ history: ContactRequestStatusHistoryEntry; authorName: string | null }>>;
}
