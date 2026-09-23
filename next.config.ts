import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.SITEGROUND_STATIC_EXPORT === "1"
    ? { output: "export" as const, images: { unoptimized: true }, trailingSlash: true }
    : {}),
};

export default nextConfig;
