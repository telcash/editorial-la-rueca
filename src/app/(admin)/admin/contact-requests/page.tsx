import Link from 'next/link';
import { BarChart3, ListChecks } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { ContactRequestMetrics } from '@/features/admin/contact-requests/components/contact-request-metrics';
import { ContactRequestsFilters } from '@/features/admin/contact-requests/components/contact-requests-filters';
import { ContactRequestsTable } from '@/features/admin/contact-requests/components/contact-requests-table';
import { EmptyContactRequestsState } from '@/features/admin/contact-requests/components/empty-contact-requests-state';
import {
  parseContactRequestListQuery,
  toContactRequestFilters,
} from '@/features/admin/contact-requests/lib/contact-request-list-query';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as ContactRequestService from '@/services/contact-requests/contact-request.service';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';
import * as ContactRequestWorkflowService from '@/services/contact-requests/contact-request-workflow.service';

interface AdminContactRequestsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    serviceId?: string;
    source?: string;
    emailStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    pageSize?: string;
    feedback?: string;
  }>;
}

export default async function AdminContactRequestsPage({
  searchParams,
}: AdminContactRequestsPageProps) {
  const params = await searchParams;
  const query = parseContactRequestListQuery(params);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  const staff = await requireEditorialStaff();

  const filters = toContactRequestFilters(query);
  const metricFilters = {
    ...filters,
    status: 'all' as const,
  };
  const [contactRequests, counts, services, statuses] = await Promise.all([
    ContactRequestService.listContactRequests({
      filters,
      page: query.page,
      pageSize: query.pageSize,
    }),
    ContactRequestService.getContactRequestCounts(metricFilters),
    EditorialServiceService.listServices('all'),
    ContactRequestWorkflowService.listStatusesForFilters(),
  ]);

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Solicitudes"
        description="Gestiona los leads recibidos por servicio, estado comercial, origen y campaña."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/contact-requests/analytics">
                <BarChart3 className="size-4" aria-hidden="true" />
                Analítica
              </Link>
            </Button>
            {staff.role === 'admin' ? (
              <Button asChild variant="outline">
                <Link href="/admin/contact-requests/statuses">
                  <ListChecks className="size-4" aria-hidden="true" />
                  Estados
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <ContactRequestMetrics counts={counts} />

      <ContactRequestsFilters
        query={query.query}
        status={query.status}
        serviceId={query.serviceId}
        source={query.source}
        emailStatus={query.emailStatus}
        dateFrom={query.dateFrom}
        dateTo={query.dateTo}
        pageSize={query.pageSize}
        services={services}
        statuses={statuses}
      />

      {contactRequests.items.length > 0 ? (
        <>
          <ContactRequestsTable contactRequests={contactRequests.items} />
          <ListPagination
            baseHref="/admin/contact-requests"
            status="active"
            query={query.query}
            page={contactRequests.page}
            pageSize={contactRequests.pageSize}
            totalPages={contactRequests.totalPages}
            totalItems={contactRequests.totalItems}
            params={{
              status: query.status,
              serviceId: query.serviceId,
              source: query.source,
              emailStatus: query.emailStatus,
              dateFrom: query.dateFrom,
              dateTo: query.dateTo,
            }}
          />
        </>
      ) : (
        <EmptyContactRequestsState />
      )}
    </section>
  );
}
