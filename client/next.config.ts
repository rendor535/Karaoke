import type { NextConfig } from "next";

const nextConfig: NextConfig = { 
  eslint: {
    ignoreDuringBuilds: true // do fazy dev TODO wyrzucic potem
  }
};

export default nextConfig;
