/**
 * Test fixture: the real starting catalogue (data/catalogue.csv) and category tree
 * (prisma/catalogue/categories.ts), turned into database-shaped rows and then into a catalog
 * with the same buildCatalog() the storefront uses.
 */
import { readFileSync } from "node:fs";

import { categories as categoryTree } from "../../prisma/catalogue/categories";
import { buildCatalog, type CategoryRow, type ProductRow } from "@/lib/catalog-build";
import type { Subcategory } from "@/lib/catalog-types";
import { parseProductsCsv, type ParsedImport } from "@/lib/products-csv";

/** Category ids here are their CSV paths ("root" or "root/sub"), which keeps fixtures readable. */
export function catalogueCategoryRows(): CategoryRow[] {
  const rows: CategoryRow[] = [];
  function walk(node: Subcategory, root: string, parentId: string | null, sortOrder: number) {
    const id = parentId === null ? root : `${root}/${node.slug}`;
    const top = parentId === null ? categoryTree.find((category) => category.slug === node.slug) : undefined;
    rows.push({
      id,
      slug: node.slug,
      name: node.name,
      icon: top?.icon ?? "PackageOpen",
      parentId,
      sortOrder,
      active: true,
      needsConfirmation: top?.needsConfirmation ?? false,
    });
    (node.children ?? []).forEach((child, index) => walk(child, root, id, index));
  }
  categoryTree.forEach((category, index) => walk(category, category.slug, null, index));
  return rows;
}

export function parseCatalogueCsv(): ParsedImport {
  const paths = new Map(catalogueCategoryRows().map((row) => [row.id, row.id]));
  return parseProductsCsv(readFileSync("data/catalogue.csv", "utf8"), paths);
}

export function catalogueRows(): { categoryRows: CategoryRow[]; productRows: ProductRow[] } {
  const categoryRows = catalogueCategoryRows();
  const { products } = parseCatalogueCsv();
  const productRows: ProductRow[] = products.map((product, index) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand ?? "",
    description: product.description ?? "",
    featured: product.featured ?? false,
    popularity: product.tags?.includes("bestseller") ? 500 + index : index,
    // Later rows count as newer, so "newest" sorting has something to work with.
    createdAt: new Date(Date.UTC(2026, 0, 1) + index * 86_400_000),
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      label: variant.label,
      priceKobo: variant.priceKobo,
      compareAtKobo: variant.compareAtKobo ?? null,
      stockQty: variant.stockQty,
      lowStockThreshold: variant.lowStockThreshold ?? 5,
    })),
    images: [],
    categories: (product.categoryIds ?? []).map((categoryId, sortOrder) => ({ categoryId, sortOrder })),
    tags: (product.tags ?? []).map((name) => ({ tag: { name } })),
  }));
  return { categoryRows, productRows };
}

export function catalogueCatalog() {
  const { categoryRows, productRows } = catalogueRows();
  return buildCatalog(categoryRows, productRows);
}
