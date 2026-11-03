/**
 * Test fixture: the SAMPLE data from prisma/sample-data, turned into database-shaped rows and
 * then into a catalog with the same buildCatalog() the storefront uses.
 */
import { categories as sampleCategories } from "../../prisma/sample-data/categories";
import { products as sampleProducts } from "../../prisma/sample-data/products";
import { buildCatalog, type CategoryRow, type ProductRow } from "@/lib/catalog-build";
import type { Subcategory } from "@/lib/catalog-types";

export function sampleRows(): { categoryRows: CategoryRow[]; productRows: ProductRow[] } {
  const categoryRows: CategoryRow[] = [];
  // Subcategory slugs are unique within a top-level category, so "root/slug" identifies a node.
  const idFor = (root: string, slug?: string) => (slug ? `${root}/${slug}` : root);

  function walk(node: Subcategory, root: string, parentId: string | null, sortOrder: number) {
    const id = parentId === null ? idFor(root) : idFor(root, node.slug);
    const top = sampleCategories.find((category) => category.slug === node.slug && !parentId);
    categoryRows.push({
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
  sampleCategories.forEach((category, index) => walk(category, category.slug, null, index));

  const productRows: ProductRow[] = sampleProducts
    .filter((product) => product.active)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      description: product.description,
      featured: false,
      popularity: product.popularity,
      createdAt: new Date(product.createdAt),
      variants: product.variants.map((variant) => ({
        ...variant,
        compareAtKobo: variant.compareAtKobo ?? null,
        lowStockThreshold: product.lowStockThreshold,
      })),
      images: [],
      categories: product.categories.map((ref, index) => ({
        categoryId: idFor(ref.category, ref.subcategory),
        sortOrder: index,
      })),
      tags: product.tags.map((name) => ({ tag: { name } })),
    }));

  return { categoryRows, productRows };
}

export function sampleCatalog() {
  const { categoryRows, productRows } = sampleRows();
  return buildCatalog(categoryRows, productRows);
}
