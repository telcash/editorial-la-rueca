import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { UpdatePasswordForm } from '@/features/auth/components/update-password-form';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminChangePasswordPage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Cambiar contraseña"
        description="Actualiza la contraseña de tu cuenta del panel."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver al dashboard
            </Link>
          </Button>
        }
      />
      <Card className="max-w-xl">
        <CardContent className="pt-6">
          <UpdatePasswordForm redirectTo="/admin?feedback=passwordUpdated" />
        </CardContent>
      </Card>
    </section>
  );
}
