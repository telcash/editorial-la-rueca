import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Mail, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ContactRequestAdminForm } from '@/features/admin/contact-requests/components/contact-request-admin-form';
import { ContactRequestPermanentDeleteButton } from '@/features/admin/contact-requests/components/contact-request-permanent-delete-button';
import { ContactRequestStatusBadge } from '@/features/admin/contact-requests/components/contact-request-status-badge';
import { ContactRequestEmailStatusBadge } from '@/features/admin/contact-requests/components/contact-request-email-status-badge';
import { ResendContactRequestNotificationButton } from '@/features/admin/contact-requests/components/resend-contact-request-notification-button';
import { ContactRequestWorkflowForms } from '@/features/admin/contact-requests/components/contact-request-workflow-forms';
import { contactRequestSourceLabels } from '@/features/admin/contact-requests/lib/contact-request-labels';
import { getContactRequestAdminFormValuesFromContactRequest } from '@/features/admin/contact-requests/lib/contact-request-form-data';
import { formatContactRequestDate } from '@/features/admin/contact-requests/lib/format-contact-request-date';
import { createContactRequestTimeline } from '@/features/admin/contact-requests/lib/contact-request-timeline';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { ContactRequestNotFoundError } from '@/services/contact-requests/contact-request.errors';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';
import * as ContactRequestWorkflowService from '@/services/contact-requests/contact-request-workflow.service';
import type { ContactRequestAdminDetail } from '@/services/contact-requests/contact-request.types';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';

interface ContactRequestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    feedback?: string;
  }>;
}

async function getContactRequestOrNotFound(id: string): Promise<ContactRequestAdminDetail> {
  try {
    return await ContactRequestService.getContactRequestById(id);
  } catch (error) {
    if (error instanceof ContactRequestNotFoundError) {
      notFound();
    }

    throw error;
  }
}

function getServiceOptions(
  services: Awaited<ReturnType<typeof EditorialServiceService.listServices>>,
  contactRequest: ContactRequestAdminDetail,
) {
  if (!contactRequest.service) {
    return services;
  }

  const currentServiceExists = services.some((service) => service.id === contactRequest.serviceId);

  if (currentServiceExists) {
    return services;
  }

  return [
    {
      id: contactRequest.service.id,
      name: contactRequest.service.name,
    },
    ...services,
  ];
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default async function ContactRequestDetailPage({
  params,
  searchParams,
}: ContactRequestDetailPageProps) {
  const { id } = await params;
  const feedback = await searchParams;
  const feedbackMessage = getAdminFeedbackMessage(feedback.feedback);
  await requireEditorialStaff();

  const contactRequest = await getContactRequestOrNotFound(id);
  const [services, statuses, notes, history] = await Promise.all([
    EditorialServiceService.listServices('all'),
    ContactRequestWorkflowService.listStatuses({ includeInactive: true }),
    ContactRequestWorkflowService.listNotes(id),
    ContactRequestWorkflowService.listStatusHistory(id),
  ]);
  const currentStatus = statuses.find((status) => status.key === contactRequest.status);
  if (!currentStatus) {
    throw new Error('La solicitud tiene un estado sin definición en el catálogo.');
  }
  const statusLabels = new Map(statuses.map((status) => [status.key, status.label]));
  const timeline = createContactRequestTimeline(notes, history);
  const statusFeedbackMessages: Record<string, string> = {
    statusUpdated: 'El estado se ha actualizado y el cambio quedó registrado.',
    statusConflict: 'La solicitud cambió en otra sesión. Recarga antes de volver a intentarlo.',
    statusInvalid: 'El estado seleccionado ya no está disponible.',
    noteAdded: 'La nota se ha añadido al historial.',
    noteInvalid: 'La nota debe contener texto y no superar los 10.000 caracteres.',
  };
  const pageFeedbackMessage =
    feedbackMessage ?? (feedback.feedback ? statusFeedbackMessages[feedback.feedback] : undefined);
  const hasErrorFeedback = [
    'contactRequestNotificationFailed',
    'statusConflict',
    'statusInvalid',
    'noteInvalid',
  ].includes(feedback.feedback ?? '');
  const serviceOptions = getServiceOptions(services, contactRequest);
  const hasUtmData = Boolean(
    contactRequest.utmSource ||
    contactRequest.utmMedium ||
    contactRequest.utmCampaign ||
    contactRequest.utmContent ||
    contactRequest.utmTerm,
  );

  return (
    <section className="space-y-6">
      {pageFeedbackMessage ? (
        <AdminFeedbackBanner
          tone={hasErrorFeedback ? 'error' : 'success'}
          message={pageFeedbackMessage}
        />
      ) : null}

      <AdminPageHeader
        title="Detalle de solicitud"
        description="Consulta el lead original y actualiza su seguimiento comercial interno."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/contact-requests">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailItem label="Nombre">{contactRequest.name}</DetailItem>
                <DetailItem label="Provincia">{contactRequest.province ?? '—'}</DetailItem>
                <DetailItem label="Email">
                  <a
                    href={`mailto:${contactRequest.email}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {contactRequest.email}
                  </a>
                </DetailItem>
                <DetailItem label="Teléfono">
                  <a
                    href={contactRequest.phone ? `tel:${contactRequest.phone}` : undefined}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {contactRequest.phone ?? '—'}
                  </a>
                </DetailItem>
              </dl>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline">
                  <a href={`mailto:${contactRequest.email}`}>
                    <Mail className="size-4" aria-hidden="true" />
                    Enviar email
                  </a>
                </Button>
                {contactRequest.phone ? (
                  <Button asChild variant="outline">
                    <a href={`tel:${contactRequest.phone}`}>
                      <Phone className="size-4" aria-hidden="true" />
                      Llamar
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Solicitud</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="mb-5 grid gap-5 sm:grid-cols-2">
                <DetailItem label="Servicio">
                  {contactRequest.service ? (
                    <>
                      <span className="font-medium">{contactRequest.service.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {contactRequest.service.slug}
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">Sin clasificar</span>
                  )}
                </DetailItem>
                <DetailItem label="Fecha de entrada">
                  {formatContactRequestDate(contactRequest.createdAt)}
                </DetailItem>
                <DetailItem label="Origen">
                  {contactRequestSourceLabels[contactRequest.source]}
                </DetailItem>
                {contactRequest.source === 'meta_instant_form' ? (
                  <DetailItem label="Formulario Meta">
                    {contactRequest.metaFormName ?? contactRequest.metaFormId ?? '—'}
                  </DetailItem>
                ) : null}
                <DetailItem label="Última actualización">
                  {formatContactRequestDate(contactRequest.updatedAt)}
                </DetailItem>
              </dl>
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {contactRequest.message}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaña</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                {hasUtmData ? (
                  <>
                    <DetailItem label="UTM source">{contactRequest.utmSource ?? '—'}</DetailItem>
                    <DetailItem label="UTM medium">{contactRequest.utmMedium ?? '—'}</DetailItem>
                    <DetailItem label="UTM campaign">
                      {contactRequest.utmCampaign ?? '—'}
                    </DetailItem>
                    <DetailItem label="UTM content">{contactRequest.utmContent ?? '—'}</DetailItem>
                    <DetailItem label="UTM term">{contactRequest.utmTerm ?? '—'}</DetailItem>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Esta solicitud no contiene datos UTM.
                  </p>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-5 sm:grid-cols-2">
                <DetailItem label="Estado email">
                  <ContactRequestEmailStatusBadge
                    emailSentAt={contactRequest.emailSentAt}
                    emailError={contactRequest.emailError}
                  />
                </DetailItem>
                <DetailItem label="Fecha de envío">
                  {contactRequest.emailSentAt
                    ? formatContactRequestDate(contactRequest.emailSentAt)
                    : 'Sin envío registrado'}
                </DetailItem>
                <DetailItem label="Último error email">
                  {contactRequest.emailError ?? 'Sin errores registrados'}
                </DetailItem>
              </dl>

              <ResendContactRequestNotificationButton
                contactRequestId={contactRequest.id}
                hasEmailSentAt={Boolean(contactRequest.emailSentAt)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seguimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5">
                <DetailItem label="Estado actual">
                  <ContactRequestStatusBadge
                    label={currentStatus.label}
                    classification={currentStatus.classification as 'open' | 'won' | 'lost'}
                  />
                  {!currentStatus.isActive ? (
                    <span className="ml-2 text-xs text-muted-foreground">Estado inactivo</span>
                  ) : null}
                </DetailItem>
              </dl>
              <div className="mt-5">
                <ContactRequestWorkflowForms
                  contactRequestId={contactRequest.id}
                  currentStatus={contactRequest.status}
                  activeStatuses={statuses.filter((status) => status.isActive)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de seguimiento</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ol className="space-y-5 border-l border-border pl-4">
                  {timeline.map((item) => (
                    <li key={`${item.kind}-${item.id}`} className="relative space-y-1">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium">
                        {item.kind === 'note'
                          ? 'Nota interna'
                          : item.previousStatus
                            ? `${statusLabels.get(item.previousStatus) ?? item.previousStatus} → ${statusLabels.get(item.newStatus) ?? item.newStatus}`
                            : `Estado inicial: ${statusLabels.get(item.newStatus) ?? item.newStatus}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.isLegacy
                          ? 'Registro importado; fecha original desconocida'
                          : formatContactRequestDate(item.sortAt)}
                        {item.authorName
                          ? ` · ${item.authorName}`
                          : item.isLegacy
                            ? ' · Autor desconocido'
                            : ''}
                      </p>
                      {item.kind === 'note' ? (
                        <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay actividad de seguimiento.
                </p>
              )}
            </CardContent>
          </Card>

          <ContactRequestAdminForm
            contactRequestId={contactRequest.id}
            initialValues={getContactRequestAdminFormValuesFromContactRequest(contactRequest)}
            services={serviceOptions}
          />

          <Card>
            <CardHeader>
              <CardTitle>Zona de riesgo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Esta acción eliminará definitivamente la solicitud y dejará de contabilizarse en las
                estadísticas del CRM.
              </p>
              <ContactRequestPermanentDeleteButton
                contactRequestId={contactRequest.id}
                entityLabel={`${contactRequest.name} · ${contactRequest.email}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
