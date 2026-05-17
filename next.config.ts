import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [
      {
        pathname: "/api/mock-character",
      },
    ],
  },
};

export default nextConfig;
