import { CheckCircle2, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';

type AdminFeedbackTone = 'success' | 'warning' | 'error';

interface AdminFeedbackBannerProps {
  tone: AdminFeedbackTone;
  message: string;
}

export function AdminFeedbackBanner({ tone, message }: AdminFeedbackBannerProps) {
  const Icon = tone === 'success' ? CheckCircle2 : TriangleAlert;

  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
