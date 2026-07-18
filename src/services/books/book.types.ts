import type { Author, Book, BookEdition } from '@/db/schema';
import type { ArchiveStatus } from '@/features/admin/lib/archive-status';
import type {
  BookEditionInput,
  CreateBookInput,
  UpdateBookInput,
} from '@/schemas/books/book.schema';

export interface BookAuthorSummary {
  id: Author['id'];
  name: Author['name'];
  slug: Author['slug'];
  photoUrl: Author['photoUrl'];
  isArchived: Author['isArchived'];
  sortOrder: number;
}

export type BookEditionDetails = BookEdition;

export type BookWithDetails = Book & {
  authors: BookAuthorSummary[];
  editions: BookEditionDetails[];
};

export type BookDataCreateInput = Omit<CreateBookInput, 'authorIds' | 'editions'>;
export type BookDataUpdateInput = Omit<UpdateBookInput, 'authorIds' | 'editions'>;

export interface BookRepository {
  findById(id: string): Promise<BookWithDetails | null>;
  findBySlug(slug: string): Promise<BookWithDetails | null>;
  findAll(status?: ArchiveStatus): Promise<BookWithDetails[]>;
  findActive(): Promise<BookWithDetails[]>;
  findArchived(): Promise<BookWithDetails[]>;
  findPublished(): Promise<BookWithDetails[]>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  existsByIsbn10(
    isbn10: string,
    excludeBookId?: string,
    excludeEditionId?: string,
  ): Promise<boolean>;
  existsByIsbn13(
    isbn13: string,
    excludeBookId?: string,
    excludeEditionId?: string,
  ): Promise<boolean>;
  create(
    bookData: BookDataCreateInput,
    authorIds: string[],
    editions: BookEditionInput[],
  ): Promise<BookWithDetails>;
  update(
    id: string,
    bookData: BookDataUpdateInput,
    authorIds?: string[],
    editions?: BookEditionInput[],
  ): Promise<BookWithDetails | null>;
  archive(id: string): Promise<BookWithDetails | null>;
  restore(id: string): Promise<BookWithDetails | null>;
  findAuthorsByBookId(bookId: string): Promise<BookAuthorSummary[]>;
  findEditionsByBookId(bookId: string): Promise<BookEditionDetails[]>;
}
