import { categoryIconNames, type CategoryIconName } from "@/components/category-icon";
import type {
  Catalog,
  Category,
  Product,
  ProductCategoryRef,
  Subcategory,
} from "@/lib/catalog-types";

/** The columns src/lib/catalog-db.ts selects. Kept plain so tests can build rows by hand. */
export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
  needsConfirmation: boolean;
};

export type ProductRow = {
  slug: string;
  name: string;
  brand: string;
  description: string;
  featured: boolean;
  popularity: number;
  createdAt: Date;
  /** Already ordered by sortOrder. */
  variants: {
    sku: string;
    label: string;
    priceKobo: number;
    compareAtKobo: number | null;
    stockQty: number;
    lowStockThreshold: number;
  }[];
  /** Already ordered by sortOrder. */
  images: { url: string; alt: string }[];
  categories: { categoryId: string; sortOrder: number }[];
  tags: { tag: { name: string } }[];
};

function toIcon(name: string): CategoryIconName {
  return (categoryIconNames as string[]).includes(name) ? (name as CategoryIconName) : "PackageOpen";
}

/**
 * Turns database rows into the storefront catalog. Inactive categories hide their whole subtree,
 * and products without any variant are left out (they cannot be bought).
 */
export function buildCatalog(categoryRows: CategoryRow[], productRows: ProductRow[]): Catalog {
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const row of categoryRows) {
    const siblings = byParent.get(row.parentId) ?? [];
    siblings.push(row);
    byParent.set(row.parentId, siblings);
  }
  const ordered = (parentId: string | null) =>
    (byParent.get(parentId) ?? [])
      .filter((row) => row.active)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  // For each visible category id: its top-level slug and (for subcategories) its own slug.
  const refById = new Map<string, ProductCategoryRef>();

  function subtree(row: CategoryRow, rootSlug: string): Subcategory {
    refById.set(row.id, { category: rootSlug, subcategory: row.slug });
    const children = ordered(row.id).map((child) => subtree(child, rootSlug));
    return { slug: row.slug, name: row.name, ...(children.length > 0 && { children }) };
  }

  const iconByRoot = new Map<string, CategoryIconName>();
  const categories: Category[] = ordered(null).map((row) => {
    refById.set(row.id, { category: row.slug });
    const icon = toIcon(row.icon);
    iconByRoot.set(row.slug, icon);
    const children = ordered(row.id).map((child) => subtree(child, row.slug));
    return {
      slug: row.slug,
      name: row.name,
      icon,
      ...(row.needsConfirmation && { needsConfirmation: true }),
      ...(children.length > 0 && { children }),
    };
  });

  const products: Product[] = productRows
    .filter((row) => row.variants.length > 0)
    .map((row) => {
      const refs = [...row.categories]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .flatMap((link) => refById.get(link.categoryId) ?? []);
      return {
        slug: row.slug,
        name: row.name,
        brand: row.brand,
        description: row.description,
        categories: refs,
        icon: (refs[0] && iconByRoot.get(refs[0].category)) ?? "PackageOpen",
        images: row.images.map((image) => ({ url: image.url, alt: image.alt || row.name })),
        variants: row.variants.map((variant) => ({
          sku: variant.sku,
          label: variant.label,
          priceKobo: variant.priceKobo,
          ...(variant.compareAtKobo !== null && { compareAtKobo: variant.compareAtKobo }),
          stockQty: variant.stockQty,
          lowStockThreshold: variant.lowStockThreshold,
        })),
        tags: row.tags.map((link) => link.tag.name),
        featured: row.featured,
        popularity: row.popularity,
        createdAt: row.createdAt.toISOString(),
      };
    });

  return { categories, products };
}
