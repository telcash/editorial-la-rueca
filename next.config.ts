import type { NextConfig } from 'next';

function getSupabaseStorageHostname() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return null;
  }
}

const supabaseStorageHostname = getSupabaseStorageHostname();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Server Actions need room for multipart/form-data overhead; image services still enforce 5 MB per file.
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: supabaseStorageHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseStorageHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
