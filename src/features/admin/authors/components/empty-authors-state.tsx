import Link from 'next/link';
import { PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function EmptyAuthorsState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-accent text-primary">
        <PenLine className="size-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">Todavía no hay autores</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Cuando se cree el primer autor, aparecerá en este listado administrativo.
      </p>
      <Button asChild className="mt-6">
        <Link href="/admin/authors/new">Nuevo autor</Link>
      </Button>
    </div>
  );
}
