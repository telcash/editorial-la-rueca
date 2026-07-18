import { describe, expect, it } from 'vitest';

import { ArchivedBadge } from './archived-badge';

describe('ArchivedBadge', () => {
  it('renders the archived badge only when archived', () => {
    expect(ArchivedBadge({ isArchived: true })).toBeTruthy();
    expect(ArchivedBadge({ isArchived: false })).toBeNull();
  });
});
