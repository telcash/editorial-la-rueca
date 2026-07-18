import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

function SkeletonRow() {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-3">
        <div className="h-16 w-11 animate-pulse rounded-md bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
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
        <div className="ml-auto h-7 w-16 animate-pulse rounded-md bg-muted" />
      </td>
    </tr>
  );
}

export default function AdminBooksLoading() {
  return (
    <section className="space-y-6">
      <AdminPageHeader title="Libros" description="Cargando catálogo editorial." />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-border bg-muted/60 text-xs font-medium uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="w-24 px-4 py-3">
                  Portada
                </th>
                <th scope="col" className="px-4 py-3">
                  Libro
                </th>
                <th scope="col" className="px-4 py-3">
                  Autores
                </th>
                <th scope="col" className="px-4 py-3">
                  Ediciones
                </th>
                <th scope="col" className="px-4 py-3">
                  Precio
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Destacado
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
