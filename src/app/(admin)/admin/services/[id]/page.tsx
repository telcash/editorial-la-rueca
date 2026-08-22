import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/features/admin/services/components/service-form';
import { getServiceFormValuesFromService } from '@/features/admin/services/lib/service-form-data';
import { ArchivedBadge } from '@/features/admin/components/data-display/archived-badge';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { EditorialServiceNotFoundError } from '@/services/editorial-services/editorial-service.errors';
import * as EditorialServiceService from '@/services/editorial-services/editorial-service.service';

interface EditServicePageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getServiceOrNotFound(id: string) {
  try {
    return await EditorialServiceService.getServiceById(id);
  } catch (error) {
    if (error instanceof EditorialServiceNotFoundError) {
      notFound();
    }

    throw error;
  }
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;
  const service = await getServiceOrNotFound(id);

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Editar servicio"
        description="Actualiza la información comercial y de publicación del servicio."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/services">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <ArchivedBadge isArchived={service.isArchived} />
      </div>

      <ServiceForm
        mode="edit"
        serviceId={service.id}
        initialValues={getServiceFormValuesFromService(service)}
      />
    </section>
  );
}
