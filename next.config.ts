import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "karanime.com" },
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      { protocol: "https", hostname: "r2.umum.work" },
      { protocol: "https", hostname: "image.myanimelist.net" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "cdn.animenewsnetwork.com" },
    ],
  },
};

export default nextConfig;
