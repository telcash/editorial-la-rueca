'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import {
  ContactRequestStatusConflictError,
  ContactRequestStatusNotFoundError,
  ContactRequestWorkflowRequestNotFoundError,
} from '@/services/contact-requests/contact-request-workflow.errors';
import * as WorkflowService from '@/services/contact-requests/contact-request-workflow.service';

export async function transitionContactRequestStatusAction(
  contactRequestId: string,
  formData: FormData,
) {
  await requireEditorialStaff();
  const newStatus = formData.get('newStatus');

  try {
    await WorkflowService.transitionStatus({ contactRequestId, newStatus });
  } catch (error) {
    if (error instanceof ContactRequestStatusConflictError) {
      redirect(`/admin/contact-requests/${contactRequestId}?feedback=statusConflict`);
    }
    if (error instanceof ContactRequestWorkflowRequestNotFoundError) {
      redirect('/admin/contact-requests?feedback=contactRequestMissing');
    }
    if (error instanceof ContactRequestStatusNotFoundError || error instanceof ZodError) {
      redirect(`/admin/contact-requests/${contactRequestId}?feedback=statusInvalid`);
    }
    throw error;
  }

  revalidatePath('/admin/contact-requests');
  revalidatePath('/admin/contact-requests/analytics');
  revalidatePath(`/admin/contact-requests/${contactRequestId}`);
  redirect(`/admin/contact-requests/${contactRequestId}?feedback=statusUpdated`);
}
