import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
  description?: string;
}

export function DashboardMetricCard({
  label,
  value,
  icon: Icon,
  href,
  description,
}: DashboardMetricCardProps) {
  const content = (
    <Card
      className={cn(
        'border-border bg-card transition-colors',
        href ? 'hover:bg-muted/40' : undefined,
      )}
    >
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">{value}</p>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {content}
    </Link>
  );
}
