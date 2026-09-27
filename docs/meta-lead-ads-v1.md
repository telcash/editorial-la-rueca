# Meta Lead Ads V1

## Ingestion

The public `POST /api/webhooks/meta/leads` handler verifies Meta's signature against the original request bytes, validates the notification, retrieves the lead from Graph API, normalizes standard fields and stores unknown answers in the CRM message. The handler accepts multiple leadgen changes per request and processes them sequentially.

The integration is universal across forms: no form IDs, questions or service IDs are configured in source. Name and email remain required CRM identity fields. A valid lead without either field cannot be represented by the current CRM model, is not fabricated, is logged with IDs and a reason only, and causes a 422 response. A batch continues processing its other leads before returning that status. Such a lead requires manual recovery from Meta if it remains unprocessable; the CRM cannot hold a placeholder record.

Phone, province and service are optional in the multichannel CRM. The website schema still requires phone, province, service and a message of at least ten characters. Meta leads without a service appear as `Sin clasificar` and can be assigned through the existing CRM editor.

## Idempotency and email

`meta_lead_id` has a nullable unique index. Inserts use an atomic conflict-safe operation; a duplicate returns success to Meta and does not send another email. If a lead is permanently deleted from the CRM, its key is deleted too. A later delivery of that same lead could recreate it; this is accepted for V1 and there is intentionally no tombstone table.

The shared intake use case persists before sending SMTP. SMTP failure leaves the lead in the CRM with the existing email error state and does not cause Meta to retry an already persisted lead. Staff can use the current CRM resend action. Graph or database failures before persistence return a retryable server error. In a batch, successful earlier inserts remain safe on retry because of idempotency.

## Meta configuration

Configure these server-only variables in the deployment environment:

- `META_WEBHOOK_VERIFY_TOKEN`
- `META_APP_SECRET`
- `META_LEAD_ACCESS_TOKEN`
- `META_GRAPH_API_VERSION`

The Graph API version is required and intentionally has no source-code default. Use a version supported by the Meta app and review it before its retirement. The lead access token needs the Meta/Page lead retrieval permissions for the connected Page. No Meta token belongs in a `NEXT_PUBLIC_*` variable.

The handler does not use the website IP rate limiter and does not call Meta Pixel. The web form's existing client-side Pixel Lead remains a separate conversion path. Meta Instant Form delivery is CRM synchronization only.

## Operational setup

Before subscribing a Page, configure the callback URL and verify token in Meta, subscribe the app/Page to leadgen notifications, and create a test lead. Confirm the app's access to the Page and lead retrieval permissions. Verify email delivery and the CRM source label `Meta Ads` in a non-production environment before Production setup.

The form name is left null in V1 because lead retrieval does not require a separate form-name lookup. The CRM displays the form ID instead. Campaign/ad IDs are not persisted. No campaign or form-to-service inference is performed.
