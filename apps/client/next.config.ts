import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3001/api/auth/:path*"
      }
    ];
  }
};

export default nextConfig;
