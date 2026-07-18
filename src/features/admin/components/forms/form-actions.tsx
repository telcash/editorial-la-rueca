import Link from 'next/link';
import type { MouseEvent } from 'react';

import { Button } from '@/components/ui/button';

interface FormActionsProps {
  cancelHref: string;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  disabled?: boolean;
  submitTitle?: string;
  onCancelClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function FormActions({
  cancelHref,
  submitLabel,
  pendingLabel,
  isPending,
  disabled = false,
  submitTitle,
  onCancelClick,
}: FormActionsProps) {
  return (
    <>
      <Button asChild variant="outline">
        <Link href={cancelHref} onClick={onCancelClick}>
          Cancelar
        </Link>
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
