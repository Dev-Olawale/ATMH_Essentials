import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const indexable = process.env.SITE_INDEXABLE === "true";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets phones on the local network load dev assets and hot reload.
  allowedDevOrigins: ["192.168.100.122"],
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos live in the public Supabase Storage bucket.
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/public/product-images/**",
          },
        ]
      : [],
  },
  async headers() {
    // Until launch, every response (pages, images, files) also carries a noindex header.
    return indexable
      ? []
      : [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
