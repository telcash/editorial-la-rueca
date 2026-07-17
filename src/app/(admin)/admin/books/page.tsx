import { BooksTable } from '@/features/admin/books/components/books-table';
import { EmptyBooksState } from '@/features/admin/books/components/empty-books-state';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import * as BookService from '@/services/books/book.service';

export default async function AdminBooksPage() {
  const books = await BookService.listBooks();

  return (
    <section className="space-y-6">
      <AdminPageHeader
        title="Libros"
        description="Gestiona el catálogo, sus autores, ediciones y precios."
      />

      {books.length > 0 ? <BooksTable books={books} /> : <EmptyBooksState />}
    </section>
  );
}
