import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { EditorialService } from '@/db/schema';
import { ServicesTable } from './services-table';

vi.mock('./service-archive-action-button', () => ({
  ServiceArchiveActionButton: ({ isArchived }: { isArchived: boolean }) => (
    <button type="button">{isArchived ? 'Restaurar' : 'Archivar'}</button>
  ),
}));

const baseService: EditorialService = {
  id: 'f3f6a49f-c418-4522-b311-a70b88aab7f4',
  name: 'Corrección de manuscrito',
  slug: 'correccion-de-manuscrito',
  shortDescription: 'Revisión profesional del manuscrito.',
  description: null,
  isPublished: true,
  isFeatured: true,
  isArchived: false,
  archivedAt: null,
  sortOrder: 1,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ServicesTable', () => {
  it('renders service status, featured state, order and edit action', () => {
    const html = renderToStaticMarkup(<ServicesTable services={[baseService]} />);

    expect(html).toContain('Corrección de manuscrito');
    expect(html).toContain('correccion-de-manuscrito');
    expect(html).toContain('Publicado');
    expect(html).toContain('Destacado');
    expect(html).toContain('1');
    expect(html).toContain('/admin/services/f3f6a49f-c418-4522-b311-a70b88aab7f4');
    expect(html).toContain('Archivar');
  });

  it('renders archived services with restore action', () => {
    const html = renderToStaticMarkup(
      <ServicesTable services={[{ ...baseService, isArchived: true }]} />,
    );

    expect(html).toContain('Archivado');
    expect(html).toContain('Restaurar');
  });
});
