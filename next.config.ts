import type { NextConfig } from "next";

const r2PublicUrl = process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [
      {
        pathname: "/api/mock-character",
      },
      {
        pathname: "/api/uploads/assets/**",
      },
    ],
    remotePatterns: r2PublicUrl
      ? [
          {
            protocol: r2PublicUrl.protocol.replace(":", "") as "http" | "https",
            hostname: r2PublicUrl.hostname,
            pathname: "/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
