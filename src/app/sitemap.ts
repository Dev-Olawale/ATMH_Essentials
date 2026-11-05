import type { MetadataRoute } from "next";

import { infoLinks, siteConfig } from "@/config/site";
import { allSubcategorySlugs } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-db";
import { categoryHref } from "@/lib/catalog-types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products } = await getCatalog();
  const url = (path: string) => `${siteConfig.url}${path}`;

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/category"), changeFrequency: "weekly", priority: 0.6 },
    ...categories.flatMap((category) => [
      { url: url(categoryHref(category.slug)), changeFrequency: "daily" as const, priority: 0.8 },
      ...allSubcategorySlugs(category).map((sub) => ({
        url: url(`${categoryHref(category.slug)}/${sub}`),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ]),
    ...products.map((product) => ({
      url: url(`/product/${product.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // /track is a utility page (noindex), not content.
    ...infoLinks.filter((link) => link.href !== "/track").map((link) => ({
      url: url(link.href),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
