import { SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

import { PublicCard } from './public-card';

interface PublicEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PublicEmptyState({ title, description, action }: PublicEmptyStateProps) {
  return (
    <PublicCard className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-public-red-soft text-public-red">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-serif-public text-2xl font-semibold text-public-ink">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-public-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </PublicCard>
  );
}
