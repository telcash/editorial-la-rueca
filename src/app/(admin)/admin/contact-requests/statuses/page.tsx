import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import { AdminFeedbackBanner } from '@/features/admin/components/feedback/admin-feedback-banner';
import {
  createContactRequestStatusAction,
  updateContactRequestStatusAction,
} from '@/features/admin/contact-requests/actions/manage-contact-request-statuses';
import { requireAdmin } from '@/services/auth/access.service';
import * as WorkflowService from '@/services/contact-requests/contact-request-workflow.service';

interface ContactRequestStatusesPageProps {
  searchParams: Promise<{ feedback?: string }>;
}

const feedbackMessages: Record<string, string> = {
  statusCreated: 'El estado se ha creado.',
  statusUpdated: 'El estado se ha actualizado.',
  statusInvalid: 'Revisa los datos del estado e inténtalo de nuevo.',
  statusSaveFailed: 'No se pudo guardar el estado.',
};

export default async function ContactRequestStatusesPage({
  searchParams,
}: ContactRequestStatusesPageProps) {
  await requireAdmin();
  const [{ feedback }, statuses] = await Promise.all([
    searchParams,
    WorkflowService.listStatuses({ includeInactive: true }),
  ]);
  const feedbackMessage = feedback ? feedbackMessages[feedback] : undefined;
  const feedbackTone =
    feedback === 'statusCreated' || feedback === 'statusUpdated' ? 'success' : 'error';

  return (
    <section className="space-y-6">
      {feedbackMessage ? (
        <AdminFeedbackBanner tone={feedbackTone} message={feedbackMessage} />
      ) : null}
      <AdminPageHeader
        title="Estados comerciales"
        description="Administra las etiquetas, el orden y la disponibilidad del pipeline. Las claves y clasificaciones no se pueden modificar después de crear un estado."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/contact-requests">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a solicitudes
            </Link>
          </Button>
        }
      />

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">Crear estado</h2>
          <p className="text-sm text-muted-foreground">
            La clave interna y la clasificación serán inmutables.
          </p>
        </div>
        <form action={createContactRequestStatusAction} className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="status-key">Clave</Label>
            <Input id="status-key" name="key" placeholder="esperando_respuesta" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status-label">Etiqueta</Label>
            <Input id="status-label" name="label" maxLength={80} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status-classification">Clasificación</Label>
            <select
              id="status-classification"
              name="classification"
              className="min-h-10 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="open"
            >
              <option value="open">Abierto</option>
              <option value="won">Ganado</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status-order">Orden</Label>
            <Input
              id="status-order"
              name="sortOrder"
              type="number"
              min={0}
              max={10000}
              defaultValue={100}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Crear estado</Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Catálogo</h2>
        {statuses.map((status) => {
          const updateAction = updateContactRequestStatusAction.bind(null, status.key);

          return (
            <form
              key={status.key}
              action={updateAction}
              className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] md:items-end"
            >
              <div className="grid gap-2">
                <Label htmlFor={`label-${status.key}`}>Etiqueta · {status.key}</Label>
                <Input
                  id={`label-${status.key}`}
                  name="label"
                  defaultValue={status.label}
                  maxLength={80}
                  required
                />
                <span className="text-xs text-muted-foreground">
                  Clasificación:{' '}
                  {status.classification === 'open'
                    ? 'Abierto'
                    : status.classification === 'won'
                      ? 'Ganado'
                      : 'Perdido'}
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`order-${status.key}`}>Orden</Label>
                <Input
                  id={`order-${status.key}`}
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={10000}
                  defaultValue={status.sortOrder}
                  required
                />
              </div>
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={status.isActive}
                  disabled={status.key === 'new'}
                  className="size-4 accent-primary"
                />
                Activo{status.key === 'new' ? ' (obligatorio)' : ''}
              </label>
              <Button type="submit" variant="outline">
                Guardar
              </Button>
            </form>
          );
        })}
      </section>
    </section>
  );
}
