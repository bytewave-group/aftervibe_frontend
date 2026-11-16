import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  images: {
    unoptimized: true,
    // aftervibe_backend.test resolves to 127.0.0.1 under Herd. The
    // optimizer (if used) would otherwise refuse the host as a private IP.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "aftervibe_backend.test",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "aftervibe_backend.test",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "*.aftervibe_backend.test",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.aftervibe_backend.test",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
