import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

function lanDevOrigins() {
  const hosts = new Set<string>(["127.0.0.1", "192.168.*.*", "10.*.*.*", "172.16.*.*"]);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) hosts.add(addr.address);
    }
  }
  return [...hosts];
}

// LAN origins are only trusted in local development — never in production builds.
const isDev = process.env.NODE_ENV !== "production";
const lanOrigins = isDev ? lanDevOrigins() : [];

const nextConfig: NextConfig = {
  ...(isDev
    ? {
        allowedDevOrigins: lanOrigins,
        experimental: { serverActions: { allowedOrigins: lanOrigins } },
      }
    : {}),
  // Allow Firebase Google popup to close and return the credential.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
