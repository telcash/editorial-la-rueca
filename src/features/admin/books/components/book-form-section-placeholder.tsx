import { CircleDashed } from 'lucide-react';

import { FormSection } from '@/features/admin/components/forms/form-section';

interface BookFormSectionPlaceholderProps {
  title: string;
  description: string;
  children: string;
}

export function BookFormSectionPlaceholder({
  title,
  description,
  children,
}: BookFormSectionPlaceholderProps) {
  return (
    <FormSection title={title} description={description}>
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
        <CircleDashed className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{children}</p>
      </div>
    </FormSection>
  );
}
