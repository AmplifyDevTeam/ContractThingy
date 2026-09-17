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

const lanOrigins = lanDevOrigins();

const nextConfig: NextConfig = {
  allowedDevOrigins: lanOrigins,
  experimental: {
    serverActions: {
      allowedOrigins: lanOrigins,
    },
  },
};

export default nextConfig;
