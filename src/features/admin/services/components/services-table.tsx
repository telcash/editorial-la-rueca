import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { FeaturedBadge } from '@/features/admin/components/data-display/featured-badge';
import { PublicationStatusBadge } from '@/features/admin/components/data-display/publication-status-badge';
import type { EditorialService } from '@/db/schema';
import { ServiceArchiveActionButton } from './service-archive-action-button';

interface ServicesTableProps {
  services: EditorialService[];
}

export function ServicesTable({ services }: ServicesTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3">
                Slug
              </th>
              <th scope="col" className="px-4 py-3">
                Publicado
              </th>
              <th scope="col" className="px-4 py-3">
                Destacado
              </th>
              <th scope="col" className="px-4 py-3">
                Orden
              </th>
              <th scope="col" className="px-4 py-3">
                Archivado
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {services.map((service) => (
              <tr key={service.id} className="bg-card">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{service.name}</div>
                  {service.shortDescription ? (
                    <div className="mt-0.5 max-w-80 truncate text-xs text-muted-foreground">
                      {service.shortDescription}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{service.slug}</td>
                <td className="px-4 py-3">
                  <PublicationStatusBadge isPublished={service.isPublished} />
                </td>
                <td className="px-4 py-3">
                  <FeaturedBadge isFeatured={service.isFeatured} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{service.sortOrder}</td>
                <td className="px-4 py-3">
                  <ArchivedBadge isArchived={service.isArchived} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/services/${service.id}`}>Editar</Link>
                    </Button>
                    <ServiceArchiveActionButton
                      serviceId={service.id}
                      isArchived={service.isArchived}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
