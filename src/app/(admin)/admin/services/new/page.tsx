import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/features/admin/services/components/service-form';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

export default function NewServicePage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Nuevo servicio"
        description="Crea un servicio editorial para futuras solicitudes comerciales."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/services">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver
            </Link>
          </Button>
        }
      />
      <ServiceForm />
    </section>
  );
}
