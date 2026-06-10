import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Admin runs on a separate port (3001 in dev). No marketing chrome here,
  // so we don't need image optimisation for our two-icon UI.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
