/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is required to fix the 404 errors in the IDE's preview window
    deploymentId: 'standalone',
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  allowedDevOrigins: [
    "https://9000-firebase-studio-1758725206340.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev",
    "https://3003-firebase-studio-1758725206340.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev",
    "https://3000-firebase-studio-1758725206340.cluster-w5vd22whf5gmav2vgkomwtc4go.cloudworkstations.dev",
  ],
};

export default nextConfig;
