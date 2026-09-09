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
import { contactRequestSourceLabels } from '@/features/admin/contact-requests/lib/contact-request-labels';
import { getContactRequestAdminFormValuesFromContactRequest } from '@/features/admin/contact-requests/lib/contact-request-form-data';
import { formatContactRequestDate } from '@/features/admin/contact-requests/lib/format-contact-request-date';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { requireEditorialStaff } from '@/services/auth/access.service';
import { ContactRequestNotFoundError } from '@/services/contact-requests/contact-request.errors';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';
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
  const feedbackTone =
    feedback.feedback === 'contactRequestNotificationFailed' ? 'error' : 'success';
  await requireEditorialStaff();

  const contactRequest = await getContactRequestOrNotFound(id);
  const services = await EditorialServiceService.listServices('all');
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
      {feedbackMessage ? (
        <AdminFeedbackBanner tone={feedbackTone} message={feedbackMessage} />
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
                <DetailItem label="Provincia">{contactRequest.province}</DetailItem>
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
                    href={`tel:${contactRequest.phone}`}
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    {contactRequest.phone}
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
                <Button asChild variant="outline">
                  <a href={`tel:${contactRequest.phone}`}>
                    <Phone className="size-4" aria-hidden="true" />
                    Llamar
                  </a>
                </Button>
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
                  <span className="font-medium">{contactRequest.service.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {contactRequest.service.slug}
                  </span>
                </DetailItem>
                <DetailItem label="Fecha de entrada">
                  {formatContactRequestDate(contactRequest.createdAt)}
                </DetailItem>
                <DetailItem label="Origen">
                  {contactRequestSourceLabels[contactRequest.source]}
                </DetailItem>
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
                <DetailItem label="Estado">
                  <ContactRequestStatusBadge status={contactRequest.status} />
                </DetailItem>
                <DetailItem label="Notas internas">
                  {contactRequest.internalNotes ? (
                    <span className="whitespace-pre-wrap">{contactRequest.internalNotes}</span>
                  ) : (
                    'Sin notas internas'
                  )}
                </DetailItem>
              </dl>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                No se añaden fechas por estado en esta fase. La analítica temporal se modelará con
                historial de eventos para evitar timestamps inconsistentes.
              </p>
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
