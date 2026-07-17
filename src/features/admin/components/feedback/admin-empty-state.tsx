import type { ReactNode } from 'react';

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function AdminEmptyState({ title, description, icon, action }: AdminEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
      {icon ? (
        <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-accent text-primary">
          {icon}
        </div>
      ) : null}
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
