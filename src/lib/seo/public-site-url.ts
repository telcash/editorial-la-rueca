export function getPublicSiteUrl(): URL | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return null;
  }

  try {
    const siteUrl = new URL(configuredSiteUrl);

    if (siteUrl.protocol !== 'http:' && siteUrl.protocol !== 'https:') {
      return null;
    }

    return siteUrl;
  } catch {
    return null;
  }
}
