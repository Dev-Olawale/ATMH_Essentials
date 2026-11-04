import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { buildCatalog } from "@/lib/catalog-build";
import type { Catalog } from "@/lib/catalog-types";
import { prisma } from "@/lib/db";

/** Every admin write calls updateTag(CATALOG_TAG) so the store shows changes straight away. */
export const CATALOG_TAG = "catalog";

/**
 * The whole active catalog in one cached read. A few thousand products fit comfortably,
 * and it keeps every storefront page to a single database round trip per cache refresh.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const [categoryRows, productRows] = await Promise.all([
    prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        parentId: true,
        sortOrder: true,
        active: true,
        needsConfirmation: true,
      },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: {
        slug: true,
        name: true,
        brand: true,
        description: true,
        featured: true,
        popularity: true,
        createdAt: true,
        variants: {
          orderBy: { sortOrder: "asc" },
          select: {
            sku: true,
            label: true,
            priceKobo: true,
            compareAtKobo: true,
            stockQty: true,
            lowStockThreshold: true,
          },
        },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
        categories: { select: { categoryId: true, sortOrder: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return buildCatalog(categoryRows, productRows);
}
