import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const desktopSource = readFileSync(
  join(process.cwd(), 'src/components/public/public-store-dropdown.tsx'),
  'utf8',
);
const mobileSource = readFileSync(
  join(process.cwd(), 'src/components/public/mobile-navigation.tsx'),
  'utf8',
);

describe('public store navigation accessibility', () => {
  it('uses the accessible dropdown primitive and secure external anchors on desktop', () => {
    expect(desktopSource).toContain('<DropdownMenu>');
    expect(desktopSource).toContain('<DropdownMenuTrigger asChild>');
    expect(desktopSource).toContain('target="_blank"');
    expect(desktopSource).toContain('rel="noopener noreferrer"');
    expect(desktopSource).toContain('href={market.baseUrl}');
    expect(desktopSource).not.toContain('amazon');
  });

  it('uses an expandable, labelled control and secure market links on mobile', () => {
    expect(mobileSource).toContain('aria-expanded={storeOpen}');
    expect(mobileSource).toContain('aria-controls={storeMenuId}');
    expect(mobileSource).toContain('href={market.baseUrl}');
    expect(mobileSource).toContain('rel="noopener noreferrer"');
  });
});
