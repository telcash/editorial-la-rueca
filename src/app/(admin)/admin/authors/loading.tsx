import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="size-11 animate-pulse rounded-md bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-4 w-8 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="ml-auto h-7 w-16 animate-pulse rounded-md bg-muted" />
      </td>
    </tr>
  );
}

export default function AdminAuthorsLoading() {
  return (
    <section className="space-y-6">
      <AdminPageHeader title="Autores" description="Cargando listado editorial." />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="w-20 px-4 py-3">
                  Foto
                </th>
                <th scope="col" className="px-4 py-3">
                  Nombre
                </th>
                <th scope="col" className="px-4 py-3">
                  País
                </th>
                <th scope="col" className="px-4 py-3">
                  Publicado
                </th>
                <th scope="col" className="px-4 py-3">
                  Destacado
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Orden
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
