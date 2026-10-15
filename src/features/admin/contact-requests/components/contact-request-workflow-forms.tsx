import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ContactRequestStatusDefinition } from '@/db/schema';
import { addContactRequestNoteAction } from '../actions/add-contact-request-note';
import { transitionContactRequestStatusAction } from '../actions/transition-contact-request-status';

interface ContactRequestWorkflowFormsProps {
  contactRequestId: string;
  currentStatus: string;
  activeStatuses: ContactRequestStatusDefinition[];
}

export function ContactRequestWorkflowForms({
  contactRequestId,
  currentStatus,
  activeStatuses,
}: ContactRequestWorkflowFormsProps) {
  const transitionAction = transitionContactRequestStatusAction.bind(null, contactRequestId);
  const noteAction = addContactRequestNoteAction.bind(null, contactRequestId);
  const currentStatusIsActive = activeStatuses.some((status) => status.key === currentStatus);

  return (
    <div className="space-y-6">
      <form action={transitionAction} className="space-y-3">
        <Label htmlFor="newStatus">Cambiar estado</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id="newStatus"
            name="newStatus"
            defaultValue={currentStatusIsActive ? currentStatus : ''}
            required
            className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {!currentStatusIsActive ? (
              <option value="" disabled>
                Selecciona un estado activo
              </option>
            ) : null}
            {activeStatuses.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="min-h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Actualizar
          </button>
        </div>
      </form>

      <form action={noteAction} className="space-y-3">
        <Label htmlFor="note-body">Añadir nota interna</Label>
        <Textarea
          id="note-body"
          name="body"
          rows={4}
          maxLength={10000}
          required
          placeholder="Añade una nota de seguimiento…"
        />
        <button
          type="submit"
          className="min-h-10 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          Añadir nota
        </button>
      </form>
    </div>
  );
}
