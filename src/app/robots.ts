import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { isSiteIndexable } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (!isSiteIndexable()) {
    // Before launch: keep the whole site out of search engines.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/api", "/cart", "/checkout", "/account"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
