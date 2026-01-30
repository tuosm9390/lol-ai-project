import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    RIOT_API_KEY: process.env.RIOT_API_KEY,
  },
};

export default nextConfig;
