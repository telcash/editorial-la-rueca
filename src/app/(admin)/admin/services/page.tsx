import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyServicesState } from '@/features/admin/services/components/empty-services-state';
import { ServicesTable } from '@/features/admin/services/components/services-table';
import { ArchiveStatusFilter } from '@/features/admin/components/archive-status-filter';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import { ListPagination } from '@/features/admin/components/list-pagination';
import { ListSearchForm } from '@/features/admin/components/list-search-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { getAdminFeedbackMessage } from '@/features/admin/lib/feedback-messages';
import { parseAdminListQuery } from '@/features/admin/lib/list-query';
import { requireEditorialStaff } from '@/services/auth/access.service';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';

interface AdminServicesPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    pageSize?: string;
    feedback?: string;
  }>;
}

export default async function AdminServicesPage({ searchParams }: AdminServicesPageProps) {
  const params = await searchParams;
  const { status, query, page, pageSize } = parseAdminListQuery(params);
  const feedbackMessage = getAdminFeedbackMessage(params.feedback);
  await requireEditorialStaff();
  const services = await EditorialServiceService.listServicesPaginated(status, {
    query,
    page,
    pageSize,
  });

  return (
    <section className="space-y-6">
      {feedbackMessage ? <AdminFeedbackBanner tone="success" message={feedbackMessage} /> : null}

      <AdminPageHeader
        title="Servicios"
        description="Gestiona los servicios editoriales que se usarán en formularios, leads y analítica."
        actions={
          <Button asChild>
            <Link href="/admin/services/new">
              <Plus className="size-4" aria-hidden="true" />
              Nuevo servicio
            </Link>
          </Button>
        }
      />

      <ArchiveStatusFilter baseHref="/admin/services" currentStatus={status} query={query} />
      <ListSearchForm
        action="/admin/services"
        status={status}
        query={query}
        placeholder="Buscar por nombre o slug..."
      />

      {services.items.length > 0 ? (
        <>
          <ServicesTable services={services.items} />
          <ListPagination
            baseHref="/admin/services"
            status={status}
            query={query}
            page={services.page}
            pageSize={services.pageSize}
            totalPages={services.totalPages}
            totalItems={services.totalItems}
          />
        </>
      ) : (
        <EmptyServicesState status={status} />
      )}
    </section>
  );
}
