'use server';

import { revalidatePath } from 'next/cache';

import { requireEditorialStaff } from '@/services/auth/access.service';
import { ContactRequestNotFoundError } from '@/services/contact-requests/contact-request.errors';
import {
  getContactRequestNotificationErrorMessage,
  sendContactRequestNotification,
} from '@/services/contact-requests/contact-request-notification';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';

export interface ResendContactRequestNotificationResult {
  success: boolean;
}

export async function resendContactRequestNotificationAction(
  contactRequestId: string,
): Promise<ResendContactRequestNotificationResult> {
  await requireEditorialStaff();

  try {
    const contactRequest = await ContactRequestService.getContactRequestById(contactRequestId);
    const result = await sendContactRequestNotification(contactRequest, undefined, undefined, {
      force: true,
    });

    if (result.status === 'sent' && result.sentAt) {
      await ContactRequestService.markContactRequestEmailNotificationSent(
        contactRequestId,
        result.sentAt,
      );
    }

    revalidatePath('/admin/contact-requests');
    revalidatePath(`/admin/contact-requests/${contactRequestId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof ContactRequestNotFoundError) {
      return { success: false };
    }

    const emailError = getContactRequestNotificationErrorMessage(error);

    try {
      await ContactRequestService.markContactRequestEmailNotificationFailed(
        contactRequestId,
        emailError,
      );
    } catch (statusError) {
      console.error('[ContactRequestAdmin] Notification retry status update failed', {
        contactRequestId,
        message: getContactRequestNotificationErrorMessage(statusError),
      });
    }

    console.error('[ContactRequestAdmin] Notification retry failed', {
      contactRequestId,
      message: emailError,
    });

    revalidatePath('/admin/contact-requests');
    revalidatePath(`/admin/contact-requests/${contactRequestId}`);

    return { success: false };
  }
}
