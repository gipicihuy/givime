import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "karanime.com" },
      { protocol: "https", hostname: "r2.umum.work" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "cdn.animenewsnetwork.com" },
    ],
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Context Cloudflare (wrangler/miniflare/workerd) cuma buat `next dev`.
// `next build` juga nge-eval config ini — kalau dipanggil di sana, tiap build
// worker nge-spawn workerd dan build Cloudflare nyangkut sampe kena timeout.
if (process.argv.includes("dev") && !process.argv.includes("build")) {
  initOpenNextCloudflareForDev();
}
