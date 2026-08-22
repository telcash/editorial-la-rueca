import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContactRequestAnalyticsPeriod } from '@/services/contact-request-analytics/contact-request-analytics.types';

const periodOptions: Array<{ value: ContactRequestAnalyticsPeriod; label: string }> = [
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'year', label: 'Este año' },
  { value: 'all', label: 'Todo' },
];

export function ContactRequestPeriodFilter({ period }: { period: ContactRequestAnalyticsPeriod }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Periodo de analítica">
      {periodOptions.map((option) => (
        <Button
          key={option.value}
          asChild
          variant={period === option.value ? 'default' : 'outline'}
        >
          <Link
            href={`/admin/contact-requests/analytics?period=${option.value}`}
            aria-current={period === option.value ? 'page' : undefined}
            className={cn(period === option.value && 'pointer-events-none')}
          >
            {option.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
