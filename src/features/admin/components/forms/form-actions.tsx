import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  cancelHref: string;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
}

export function FormActions({
  cancelHref,
  submitLabel,
  pendingLabel,
  isPending,
  disabled = false,
}: FormActionsProps) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={cancelHref}>Cancelar</Link>
      </Button>
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </>
  );
}
