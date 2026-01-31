import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
