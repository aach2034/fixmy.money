import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  distDir: process.env.DIST_DIR || '.next',
  // Mark PDF packages as server-external so webpack doesn't try to bundle them
  serverExternalPackages: ['pdfjs-dist'],
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 31536000,
    qualities: [75, 85, 100],
  },
  async headers() {
    return [
      {
        source: '/:path(dashboard|admin|api|checkout|onboarding|workspace-setup|settings|client-portal/dashboard)/:rest*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
    ];
  },
};
export default nextConfig;
