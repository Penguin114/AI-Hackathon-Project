import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false, experimental: { cpus: 1 },
};
export default config;