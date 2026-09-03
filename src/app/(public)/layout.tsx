import type { Metadata } from 'next';

import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { PublicContactHashHandler } from '@/components/public/public-contact-hash-handler';
import { siteConfig } from '@/config/site';
import { CookieConsentProvider } from '@/components/public/cookie-consent/cookie-consent-provider';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      <div className="flex min-h-screen flex-col bg-public-background font-public text-public-ink">
        <PublicContactHashHandler />
        <PublicHeader />
        <main className="flex-1">{children}</main>
        <PublicFooter />
      </div>
    </CookieConsentProvider>
  );
}
