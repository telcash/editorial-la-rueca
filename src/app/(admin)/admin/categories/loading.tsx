import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-7 w-36 animate-pulse rounded-md bg-muted" />
      </td>
    </tr>
  );
}

export default function AdminCategoriesLoading() {
  return (
    <section className="space-y-6">
      <AdminPageHeader title="Categorías" description="Cargando categorías editoriales." />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
