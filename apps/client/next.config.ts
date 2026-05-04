import type { NextConfig } from "next";
import { loadClientConfig } from "./src/config/env";

const clientConfig = loadClientConfig();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const bffBaseUrl = clientConfig.bffBaseUrl;

    return [
      {
        source: "/api/auth/:path*",
        destination: `${bffBaseUrl}/api/auth/:path*`
      },
      {
        // 浏览器保持同源请求，Next 负责转发到 BFF。
        source: "/api/commodity/:path*",
        destination: `${bffBaseUrl}/api/commodity/:path*`
      },
      {
        source: "/api/upload",
        destination: `${bffBaseUrl}/api/upload`
      },
      {
        source: "/api/users/:path*",
        destination: `${bffBaseUrl}/api/users/:path*`
      }
    ];
  }
};

export default nextConfig;
