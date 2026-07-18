import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PermanentDeleteDialog } from './permanent-delete-dialog';

describe('PermanentDeleteDialog', () => {
  it('requires the exact confirmation before enabling the destructive button', () => {
    const html = renderToStaticMarkup(
      <PermanentDeleteDialog
        open
        title="Eliminar libro definitivamente"
        description="Esta acción no se puede deshacer."
        entityLabel="El jardín perdido"
        pending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain('Escribe ELIMINAR para continuar');
    expect(html).toContain('Eliminar definitivamente');
    expect(html).toContain('disabled=""');
  });

  it('shows dependency messages instead of the confirmation input', () => {
    const html = renderToStaticMarkup(
      <PermanentDeleteDialog
        open
        title="Eliminar autor definitivamente"
        description="Esta acción no se puede deshacer."
        entityLabel="Ana Autora"
        dependencyMessage="No se puede eliminar porque está relacionado con 1 libro."
        pending={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(html).toContain('No se puede eliminar porque está relacionado con 1 libro.');
    expect(html).not.toContain('Escribe ELIMINAR para continuar');
  });
});
