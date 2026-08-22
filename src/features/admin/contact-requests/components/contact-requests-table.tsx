import Link from 'next/link';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ContactRequestAdminListItem } from '@/services/contact-requests/contact-request.types';
import { contactRequestSourceLabels } from '../lib/contact-request-labels';
import { formatContactRequestDate } from '../lib/format-contact-request-date';
import { ContactRequestStatusBadge } from './contact-request-status-badge';

interface ContactRequestsTableProps {
  contactRequests: ContactRequestAdminListItem[];
}

export function ContactRequestsTable({ contactRequests }: ContactRequestsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">
                Fecha
              </th>
              <th scope="col" className="px-4 py-3">
                Contacto
              </th>
              <th scope="col" className="px-4 py-3">
                Servicio
              </th>
              <th scope="col" className="px-4 py-3">
                Provincia
              </th>
              <th scope="col" className="px-4 py-3">
                Estado
              </th>
              <th scope="col" className="px-4 py-3">
                Origen
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contactRequests.map((contactRequest) => (
              <tr key={contactRequest.id} className="bg-card">
                <td className="px-4 py-3 text-muted-foreground">
                  {formatContactRequestDate(contactRequest.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{contactRequest.name}</div>
                  <div
                    className={
                      contactRequest.emailSentAt && !contactRequest.emailError
                        ? 'mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                        : 'mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
                    }
                  >
                    {contactRequest.emailSentAt && !contactRequest.emailError ? (
                      <>
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Email enviado
                      </>
                    ) : (
                      <>
                        <TriangleAlert className="size-3" aria-hidden="true" />
                        Email pendiente
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <a href={`mailto:${contactRequest.email}`} className="hover:text-foreground">
                      {contactRequest.email}
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <a href={`tel:${contactRequest.phone}`} className="hover:text-foreground">
                      {contactRequest.phone}
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{contactRequest.service.name}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {contactRequest.service.slug}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{contactRequest.province}</td>
                <td className="px-4 py-3">
                  <ContactRequestStatusBadge status={contactRequest.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {contactRequestSourceLabels[contactRequest.source]}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/contact-requests/${contactRequest.id}`}>Ver detalle</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
