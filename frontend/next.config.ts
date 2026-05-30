import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@arkiv-network/sdk"],
};

export default nextConfig;
