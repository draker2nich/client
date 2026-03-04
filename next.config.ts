import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make server-side env vars available to API routes
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;