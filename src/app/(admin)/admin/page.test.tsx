import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDashboardData: vi.fn(),
  requireEditorialStaff: vi.fn(),
}));

vi.mock('@/services/dashboard/dashboard.service', () => ({
  getDashboardData: mocks.getDashboardData,
}));

vi.mock('@/services/auth/access.service', () => ({
  requireEditorialStaff: mocks.requireEditorialStaff,
}));

vi.mock('@/features/admin/dashboard/components/recent-books', () => ({
  RecentBooks: () => null,
}));

vi.mock('@/features/admin/dashboard/components/recent-authors', () => ({
  RecentAuthors: () => null,
}));

vi.mock('@/features/admin/dashboard/components/quick-actions', () => ({
  QuickActions: () => null,
}));

const { default: AdminPage } = await import('./page');

describe('Admin dashboard metric navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireEditorialStaff.mockResolvedValue({ role: 'editor' });
    mocks.getDashboardData.mockResolvedValue({
      metrics: {
        authorsActive: 10,
        authorsArchived: 2,
        authorsWithoutPhoto: 3,
        booksActive: 20,
        booksPublished: 12,
        booksDraft: 8,
        booksArchived: 4,
        booksWithoutCover: 5,
      },
      recentBooks: [],
      recentAuthors: [],
    });
  });

  it('uses unambiguous titles, descriptions and exact list filters', async () => {
    const html = renderToStaticMarkup(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('Autores activos');
    expect(html).toContain('Autores disponibles en el catálogo');
    expect(html).toContain('href="/admin/authors"');

    expect(html).toContain('Autores archivados');
    expect(html).toContain('Autores fuera del catálogo activo');
    expect(html).toContain('href="/admin/authors?status=archived"');

    expect(html).toContain('Autores sin fotografía');
    expect(html).toContain('Autores activos sin fotografía');
    expect(html).toContain('href="/admin/authors?image=false"');

    expect(html).toContain('Libros activos');
    expect(html).toContain('Libros no archivados');
    expect(html).toContain('href="/admin/books"');

    expect(html).toContain('Libros publicados');
    expect(html).toContain('Libros activos y visibles');
    expect(html).toContain('href="/admin/books?published=true"');

    expect(html).toContain('Libros en borrador');
    expect(html).toContain('Libros activos pendientes de publicación');
    expect(html).toContain('href="/admin/books?published=false"');

    expect(html).toContain('Libros sin portada');
    expect(html).toContain('Libros activos sin imagen de portada');
    expect(html).toContain('href="/admin/books?image=false"');

    expect(html).toContain('Libros archivados');
    expect(html).toContain('Libros fuera del catálogo activo');
    expect(html).toContain('href="/admin/books?status=archived"');
  });
});
