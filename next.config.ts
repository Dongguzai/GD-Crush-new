import type { NextConfig } from "next";

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
  },
};

export default nextConfig;
