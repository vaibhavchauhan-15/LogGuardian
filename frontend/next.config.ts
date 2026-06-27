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
  async headers() {
    return [
      {
        // Firebase signInWithPopup needs the opener to keep a handle on the
        // popup window. The default COOP ("same-origin") blocks the
        // `window.closed` check and the sign-in promise never resolves.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
