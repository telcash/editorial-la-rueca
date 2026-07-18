import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-3 w-36 animate-pulse rounded bg-muted" />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="h-5 w-44 animate-pulse rounded bg-muted" />
      <div className="mt-5 space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <div className="size-12 animate-pulse rounded-md bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardLoading() {
  return (
    <section className="space-y-8">
      <AdminPageHeader title="Dashboard" description="Cargando resumen general del catálogo." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SkeletonList />
        <SkeletonList />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-8 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}
