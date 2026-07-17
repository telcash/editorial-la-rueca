import { BookOpenText } from 'lucide-react';

import { AdminEmptyState } from '@/features/admin/components/feedback/admin-empty-state';

export function EmptyBooksState() {
  return (
    <AdminEmptyState
      title="Todavía no hay libros"
      description="Cuando agregues el primer libro, aparecerá aquí con sus autores, ediciones y precios."
      icon={<BookOpenText className="size-5" aria-hidden="true" />}
    />
  );
}
