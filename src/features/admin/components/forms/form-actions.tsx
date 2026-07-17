import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  cancelHref: string;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
  submitTitle?: string;
}

export function FormActions({
  cancelHref,
  submitLabel,
  pendingLabel,
  isPending,
  disabled = false,
  submitTitle,
}: FormActionsProps) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={cancelHref}>Cancelar</Link>
      </Button>
      <Button
        type="submit"
        disabled={disabled || isPending}
        aria-disabled={disabled || isPending ? true : undefined}
        title={submitTitle}
      >
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </>
  );
}
