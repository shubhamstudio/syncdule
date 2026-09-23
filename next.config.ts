import type { NextConfig } from "next";

const configuredDevOrigin = process.env.NEXT_PUBLIC_DEV_ORIGIN
  ?.replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

const nextConfig: NextConfig = {
  experimental: {
    // Clerk's proxy buffers request bodies before API routes receive them.
    // Keep this just above the route's 250 MB video limit so multipart
    // uploads are not truncated before request.formData() can parse them.
    proxyClientMaxBodySize: "256mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],    
  },
  allowedDevOrigins: configuredDevOrigin ? [configuredDevOrigin] : [],
};

export default nextConfig;
