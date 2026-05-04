import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "http://localhost:3001/api/auth/:path*"
      },
      {
        // 浏览器保持同源请求，Next 负责转发到 BFF。
        source: "/api/commodity/:path*",
        destination: "http://localhost:3001/api/commodity/:path*"
      },
      {
        source: "/api/upload",
        destination: "http://localhost:3001/api/upload"
      },
      {
        source: "/api/users/:path*",
        destination: "http://localhost:3001/api/users/:path*"
      }
    ];
  }
};

export default nextConfig;
