import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/tourney",
        destination: "/tournaments",
      },
      {
        source: "/tourney/:id",
        destination: "/tournaments/:id",
      },
      {
        source: "/tourney/:id/:path*",
        destination: "/tournaments/:id/:path*",
      },
      {
        source: "/pbcc",
        destination: "/round-robin/rpro",
      },
      {
        source: "/pbcc/:path*",
        destination: "/round-robin/rpro/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lwrpickleballclub.com",
        pathname: "/lwrpc-logo.png",
      },
    ],
  },
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
