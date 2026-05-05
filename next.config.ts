import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/lyra",
        permanent: false,
      },
      {
        source: "/workspace",
        destination: "/lyra",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
