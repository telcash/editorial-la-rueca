import type { MetadataRoute } from 'next';

import { getPublicSiteUrl } from '@/lib/seo/public-site-url';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/login', '/auth', '/unauthorized'],
    },
    sitemap: siteUrl ? new URL('/sitemap.xml', siteUrl).toString() : undefined,
  };
}
