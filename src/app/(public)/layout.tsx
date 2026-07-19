import type { Metadata } from 'next';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-public-background font-public text-public-ink">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
