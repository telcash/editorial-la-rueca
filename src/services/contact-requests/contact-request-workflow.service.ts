import 'server-only';

import * as contactRequestWorkflowRepository from '@/repositories/contact-requests/contact-request-workflow.repository';
import { requireAdmin, requireEditorialStaff } from '@/services/auth/access.service';
import { createContactRequestWorkflowService } from './contact-request-workflow.service.core';

export type { ContactRequestWorkflowRepository } from './contact-request-workflow.types';
export {
  ContactRequestInitialStatusCannotBeDeactivatedError,
  ContactRequestStatusConflictError,
  ContactRequestStatusNotFoundError,
  ContactRequestWorkflowRequestNotFoundError,
} from './contact-request-workflow.errors';

const workflowService = createContactRequestWorkflowService(contactRequestWorkflowRepository);

export async function listStatuses(options: { includeInactive?: boolean } = {}) {
  await requireEditorialStaff();
  return workflowService.listStatuses(options);
}

export async function listStatusesForFilters() {
  await requireEditorialStaff();
  return workflowService.listStatusesForFilters();
}

export async function getStatus(key: string) {
  await requireEditorialStaff();
  return workflowService.getStatus(key);
}

export async function createStatus(input: unknown) {
  await requireAdmin();
  return workflowService.createStatus(input);
}

export async function updateStatusDefinition(key: string, input: unknown) {
  await requireAdmin();
  return workflowService.updateStatusDefinition(key, input);
}

export async function addNote(input: unknown) {
  const staff = await requireEditorialStaff();
  return workflowService.addNote(input, staff.userId);
}

export async function listNotes(contactRequestId: string) {
  await requireEditorialStaff();
  return workflowService.listNotes(contactRequestId);
}

export async function transitionStatus(input: unknown) {
  const staff = await requireEditorialStaff();
  return workflowService.transitionStatus(input, staff.userId);
}

export async function listStatusHistory(contactRequestId: string) {
  await requireEditorialStaff();
  return workflowService.listStatusHistory(contactRequestId);
}
