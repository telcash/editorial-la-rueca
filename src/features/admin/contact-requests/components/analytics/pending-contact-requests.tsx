import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { PendingContactRequestAnalyticsItem } from '@/services/contact-request-analytics/contact-request-analytics.types';
import { formatContactRequestDate } from '../../lib/format-contact-request-date';

export function PendingContactRequests({
  pending,
}: {
  pending: PendingContactRequestAnalyticsItem[];
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold text-foreground">Pendientes de atención</h2>
      <p className="text-sm text-muted-foreground">
        Los leads nuevos más antiguos aparecen primero.
      </p>

      {pending.length > 0 ? (
        <div className="mt-5 space-y-3">
          {pending.map((contactRequest) => (
            <div
              key={contactRequest.id}
              className="flex flex-col gap-3 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{contactRequest.name}</p>
                <p className="text-sm text-muted-foreground">{contactRequest.serviceName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatContactRequestDate(contactRequest.createdAt)}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/contact-requests/${contactRequest.id}`}>Ver detalle</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No hay leads nuevos pendientes en este período.
        </p>
      )}
    </section>
  );
}
