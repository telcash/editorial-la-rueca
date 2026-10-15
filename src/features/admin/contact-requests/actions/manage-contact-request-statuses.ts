'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ZodError } from 'zod';

import { requireAdmin } from '@/services/auth/access.service';
import * as WorkflowService from '@/services/contact-requests/contact-request-workflow.service';

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function getSortOrder(formData: FormData) {
  const value = Number(getString(formData, 'sortOrder'));
  return Number.isInteger(value) ? value : Number.NaN;
}

function handleStatusActionError(error: unknown): never {
  if (error instanceof ZodError) {
    redirect('/admin/contact-requests/statuses?feedback=statusInvalid');
  }
  redirect('/admin/contact-requests/statuses?feedback=statusSaveFailed');
}

export async function createContactRequestStatusAction(formData: FormData) {
  await requireAdmin();

  try {
    await WorkflowService.createStatus({
      key: getString(formData, 'key'),
      label: getString(formData, 'label'),
      classification: getString(formData, 'classification'),
      sortOrder: getSortOrder(formData),
    });
  } catch (error) {
    handleStatusActionError(error);
  }

  revalidatePath('/admin/contact-requests/statuses');
  revalidatePath('/admin/contact-requests');
  revalidatePath('/admin/contact-requests/analytics');
  redirect('/admin/contact-requests/statuses?feedback=statusCreated');
}

export async function updateContactRequestStatusAction(key: string, formData: FormData) {
  await requireAdmin();

  try {
    await WorkflowService.updateStatusDefinition(key, {
      label: getString(formData, 'label'),
      sortOrder: getSortOrder(formData),
      isActive: key === 'new' || formData.has('isActive'),
    });
  } catch (error) {
    handleStatusActionError(error);
  }

  revalidatePath('/admin/contact-requests/statuses');
  revalidatePath('/admin/contact-requests');
  revalidatePath('/admin/contact-requests/analytics');
  redirect('/admin/contact-requests/statuses?feedback=statusUpdated');
}
