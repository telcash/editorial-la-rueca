import 'server-only';

import type { CreateContactRequestInput } from '@/schemas/contact-requests/contact-request.schema';
import {
  getContactRequestNotificationErrorMessage,
  sendContactRequestNotification,
} from './contact-request-notification';
import * as ContactRequestService from './contact-request.service';

export type CreateAndNotifyContactRequestResult =
  { status: 'created'; contactRequestId: string } | { status: 'duplicate'; contactRequestId: null };

export async function createAndNotifyContactRequest(
  input: CreateContactRequestInput,
): Promise<CreateAndNotifyContactRequestResult> {
  const creation = await ContactRequestService.createContactRequest(input);

  if (creation.status === 'duplicate') {
    return { status: 'duplicate', contactRequestId: null };
  }

  const contactRequestId = creation.contactRequest.id;
  let contactRequest: Awaited<ReturnType<typeof ContactRequestService.getContactRequestById>>;

  try {
    contactRequest = await ContactRequestService.getContactRequestById(contactRequestId);
  } catch (error) {
    console.error('[ContactRequest] Notification skipped because the lead could not be read', {
      contactRequestId,
      message: getContactRequestNotificationErrorMessage(error),
    });
    return { status: 'created', contactRequestId };
  }

  let notification: Awaited<ReturnType<typeof sendContactRequestNotification>>;
  try {
    notification = await sendContactRequestNotification(contactRequest);
  } catch (error) {
    const emailError = getContactRequestNotificationErrorMessage(error);

    try {
      await ContactRequestService.markContactRequestEmailNotificationFailed(
        contactRequestId,
        emailError,
      );
    } catch (markError) {
      console.error('[ContactRequest] Notification status update failed', {
        contactRequestId,
        message: getContactRequestNotificationErrorMessage(markError),
      });
    }

    console.error('[ContactRequest] Notification failed', {
      contactRequestId,
      message: emailError,
    });
    return { status: 'created', contactRequestId };
  }

  if (notification.status === 'sent' && notification.sentAt) {
    try {
      await ContactRequestService.markContactRequestEmailNotificationSent(
        contactRequestId,
        notification.sentAt,
      );
    } catch (error) {
      console.error('[ContactRequest] Notification sent but status confirmation failed', {
        contactRequestId,
        message: getContactRequestNotificationErrorMessage(error),
      });
    }
  }

  return { status: 'created', contactRequestId };
}
