import type { CategoryIconName } from "@/components/category-icon";

/** Storefront shapes. They are built from the database in src/lib/catalog-db.ts. */

export type Subcategory = {
  slug: string;
  name: string;
  children?: Subcategory[];
};

export type Category = Subcategory & {
  icon: CategoryIconName;
  /** From the poster only; the owner has not yet confirmed it for launch (CLAUDE.md §4). */
  needsConfirmation?: boolean;
};

export type ProductVariant = {
  sku: string;
  label: string;
  priceKobo: number;
  compareAtKobo?: number;
  stockQty: number;
  lowStockThreshold: number;
};

export type ProductImage = { url: string; alt: string };

export type ProductCategoryRef = {
  category: string;
  subcategory?: string;
};

export type Product = {
  slug: string;
  name: string;
  brand: string;
  /** Many-to-many: a product can appear in several categories. The first is its primary one. */
  categories: ProductCategoryRef[];
  /** Icon of the primary category, shown when there is no photo. */
  icon: CategoryIconName;
  description: string;
  images: ProductImage[];
  variants: ProductVariant[];
  /** Lowercase tag names set in the admin, e.g. "bestseller", "new". */
  tags: string[];
  /** Pinned to the front of the homepage Best Sellers row. */
  featured: boolean;
  /** Higher sells more; drives the "popular" sort. */
  popularity: number;
  /** ISO date; drives the "newest" sort. */
  createdAt: string;
};

export type Catalog = { categories: Category[]; products: Product[] };

export function categoryHref(slug: string): string {
  return `/category/${slug}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
