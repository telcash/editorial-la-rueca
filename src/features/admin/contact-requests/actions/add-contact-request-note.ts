'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { requireEditorialStaff } from '@/services/auth/access.service';
import { ContactRequestWorkflowRequestNotFoundError } from '@/services/contact-requests/contact-request-workflow.errors';
import * as WorkflowService from '@/services/contact-requests/contact-request-workflow.service';

export async function addContactRequestNoteAction(contactRequestId: string, formData: FormData) {
  await requireEditorialStaff();
  const body = formData.get('body');

  try {
    await WorkflowService.addNote({ contactRequestId, body });
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/admin/contact-requests/${contactRequestId}?feedback=noteInvalid`);
    }
    if (error instanceof ContactRequestWorkflowRequestNotFoundError) {
      redirect('/admin/contact-requests?feedback=contactRequestMissing');
    }
    throw error;
  }

  revalidatePath(`/admin/contact-requests/${contactRequestId}`);
  redirect(`/admin/contact-requests/${contactRequestId}?feedback=noteAdded`);
}
