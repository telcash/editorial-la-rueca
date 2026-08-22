import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildListHref } from '@/features/admin/lib/list-query';
import type { EditorialService } from '@/db/schema';
import {
  contactRequestSources,
  contactRequestStatuses,
} from '@/schemas/contact-requests/contact-request.schema';
import {
  contactRequestSourceLabels,
  contactRequestStatusLabels,
} from '../lib/contact-request-labels';
import type {
  ContactRequestEmailStatusFilter,
  ContactRequestSourceFilter,
  ContactRequestStatusFilter,
} from '../lib/contact-request-list-query';

interface ContactRequestsFiltersProps {
  query: string;
  status: ContactRequestStatusFilter;
  serviceId: string;
  source: ContactRequestSourceFilter;
  emailStatus: ContactRequestEmailStatusFilter;
  dateFrom: string;
  dateTo: string;
  pageSize: number;
  services: Pick<EditorialService, 'id' | 'name'>[];
}

export function ContactRequestsFilters({
  query,
  status,
  serviceId,
  source,
  emailStatus,
  dateFrom,
  dateTo,
  pageSize,
  services,
}: ContactRequestsFiltersProps) {
  const hasFilters = Boolean(
    query ||
    status !== 'all' ||
    serviceId ||
    source !== 'all' ||
    emailStatus !== 'all' ||
    dateFrom ||
    dateTo,
  );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <form action="/admin/contact-requests" className="space-y-4">
        <input type="hidden" name="pageSize" value={pageSize} />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <div className="grid gap-1.5 xl:col-span-2">
            <label htmlFor="contact-request-query" className="text-sm font-medium text-foreground">
              Buscar
            </label>
            <Input
              id="contact-request-query"
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Nombre, email, teléfono o provincia..."
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="contact-request-status" className="text-sm font-medium text-foreground">
              Estado
            </label>
            <select
              id="contact-request-status"
              name="status"
              defaultValue={status}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos</option>
              {contactRequestStatuses.map((option) => (
                <option key={option} value={option}>
                  {contactRequestStatusLabels[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="contact-request-service"
              className="text-sm font-medium text-foreground"
            >
              Servicio
            </label>
            <select
              id="contact-request-service"
              name="serviceId"
              defaultValue={serviceId}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="contact-request-source" className="text-sm font-medium text-foreground">
              Origen
            </label>
            <select
              id="contact-request-source"
              name="source"
              defaultValue={source}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos</option>
              {contactRequestSources.map((option) => (
                <option key={option} value={option}>
                  {contactRequestSourceLabels[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="contact-request-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <select
              id="contact-request-email"
              name="emailStatus"
              defaultValue={emailStatus}
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="sent">Enviado</option>
              <option value="problem">Error / pendiente</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="contact-request-date-from"
              className="text-sm font-medium text-foreground"
            >
              Desde
            </label>
            <Input
              id="contact-request-date-from"
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="contact-request-date-to"
              className="text-sm font-medium text-foreground"
            >
              Hasta
            </label>
            <Input id="contact-request-date-to" type="date" name="dateTo" defaultValue={dateTo} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Aplicar filtros</Button>
          {hasFilters ? (
            <Button asChild type="button" variant="outline">
              <Link href={buildListHref('/admin/contact-requests', { pageSize })}>
                Limpiar filtros
              </Link>
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
