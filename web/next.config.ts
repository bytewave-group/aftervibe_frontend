import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // App Router View Transitions work in Next 16.4 without a flag.
  // `experimental.viewTransition` was removed in 16.3.
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Client router cache: back/repeat visits reuse the last RSC payload.
    // Requires a dev-server restart to take effect.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  images: {
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

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then((mod) => mod.initOpenNextCloudflareForDev());
}
