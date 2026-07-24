import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ArchiveStatus } from '../lib/archive-status';

interface ListSearchFormProps {
  action: string;
  query: string;
  status: ArchiveStatus;
  placeholder: string;
}

export function ListSearchForm({ action, query, status, placeholder }: ListSearchFormProps) {
  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row"
    >
      <input type="hidden" name="status" value={status} />
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>
      <Button type="submit">Buscar</Button>
    </form>
  );
}
