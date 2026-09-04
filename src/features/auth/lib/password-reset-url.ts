const PASSWORD_RESET_PATH = '/auth/callback';

export function getPasswordResetRedirectUrl(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    throw new Error('NEXT_PUBLIC_SITE_URL is not configured');
  }

  const siteUrl = new URL(configuredSiteUrl);

  if (siteUrl.protocol !== 'http:' && siteUrl.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS');
  }

  siteUrl.pathname = siteUrl.pathname.replace(/\/+$/, '') + PASSWORD_RESET_PATH;
  siteUrl.search = '?next=%2Flogin%2Fupdate-password';
  siteUrl.hash = '';

  return siteUrl.toString();
}
