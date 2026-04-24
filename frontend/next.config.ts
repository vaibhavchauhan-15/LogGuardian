import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    // Pin project root to avoid monorepo lockfile auto-detection issues.
    root: configDir,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
