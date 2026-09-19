import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: Express (backend/server.js) serves web/out in production.
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
  transpilePackages: ["three"],
};

export default nextConfig;
