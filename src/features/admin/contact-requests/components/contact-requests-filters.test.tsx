import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ContactRequestsFilters } from './contact-requests-filters';

describe('ContactRequestsFilters', () => {
  it('shows dynamic and inactive historical statuses with their current labels', () => {
    const html = renderToStaticMarkup(
      <ContactRequestsFilters
        query=""
        status="no_answer"
        serviceId=""
        source="all"
        emailStatus="all"
        dateFrom=""
        dateTo=""
        pageSize={20}
        services={[]}
        statuses={[
          { key: 'new', label: 'Nuevo', isActive: true },
          { key: 'no_answer', label: 'No contesta', isActive: true },
          { key: 'old_custom', label: 'Estado histórico', isActive: false },
        ]}
      />,
    );

    expect(html).toContain('No contesta');
    expect(html).toContain('Estado histórico (inactivo)');
    expect(html).toContain('value="no_answer"');
  });
});
