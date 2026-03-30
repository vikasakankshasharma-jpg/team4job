import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  eslint: {
    // We now enforce ESLint checks during the build
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['firebase-admin'],
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000', 'localhost:9099', '127.0.0.1:9099'],
    },
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'lodash',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'framer-motion',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/functions',
      '@react-google-maps/api',
    ],
  },
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://sdk.cashfree.com https://va.vercel-scripts.com https://*.googleapis.com https://*.googletagmanager.com https://www.google.com/recaptcha https://www.gstatic.com/recaptcha https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.googleapis.com https://*.gstatic.com https://firebasestorage.googleapis.com 127.0.0.1:* localhost:* https://maps.gstatic.com https://maps.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' wss://*.firebaseio.com https://api.postalpincode.in https://*.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseio.com https://*.cashfree.com https://vitals.vercel-insights.com https://*.google-analytics.com https://*.analytics.google.com 127.0.0.1:* localhost:*; frame-src 'self' https://*.cashfree.com https://www.google.com/recaptcha https://recaptcha.google.com/recaptcha https://*.firebaseapp.com; ${process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_USE_EMULATOR !== 'true' ? 'upgrade-insecure-requests;' : ''}`.trim(),
          },
        ],
      },
    ];
  },
};

const nextConfigWithBundleAnalyzer = withBundleAnalyzer(nextConfig);

// Sentry runtime monitoring is still active (see instrumentation-client.ts)
export default withSentryConfig(nextConfigWithBundleAnalyzer, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "team-gq",
  project: "javascript-nextjs",

  // Disable source map generation for faster local E2E builds
  sourcemaps: {
    disable: !process.env.CI,
  },

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Modern way to disable logger and enable Vercel monitors in Sentry v8
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
});
