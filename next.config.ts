
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // This is the correct way to enable file watching via polling
    // which is necessary in some containerized environments
    fileWatching: {
      backend: 'chokidar',
      options: {
        usePolling: true,
        interval: 1000,
      },
    },
    // This allows cross-origin requests from the development environment
    allowedDevOrigins: [
        "https://6000-firebase-studio-1758725206340.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev"
    ]
  },
};

export default nextConfig;
