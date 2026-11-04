import {
  categoryHref,
  type Catalog,
  type Category,
  type Product,
  type Subcategory,
} from "@/lib/catalog-types";

/** Pure helpers over a catalog loaded by getCatalog() (src/lib/catalog-db.ts). */

export function getCategory(categories: Category[], slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getProduct(products: Product[], slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

/** The route from a category down to a subcategory slug, excluding the category itself. */
export function findSubcategoryPath(node: Subcategory, slug: string): Subcategory[] | undefined {
  for (const child of node.children ?? []) {
    if (child.slug === slug) return [child];
    const deeper = findSubcategoryPath(child, slug);
    if (deeper) return [child, ...deeper];
  }
  return undefined;
}

function descendantSlugs(node: Subcategory): string[] {
  return [node.slug, ...(node.children ?? []).flatMap(descendantSlugs)];
}

export function allSubcategorySlugs(category: Category): string[] {
  return descendantSlugs(category).slice(1);
}

/** Products in a category, or in a subcategory and everything beneath it. */
export function productsInCategory(
  products: Product[],
  category: Category,
  subcategory?: Subcategory,
): Product[] {
  const allowed = subcategory ? new Set(descendantSlugs(subcategory)) : undefined;
  return products.filter((product) =>
    product.categories.some(
      (ref) =>
        ref.category === category.slug &&
        (!allowed || (ref.subcategory !== undefined && allowed.has(ref.subcategory))),
    ),
  );
}

export function relatedProducts(products: Product[], product: Product, limit = 4): Product[] {
  const primary = product.categories[0]?.category;
  if (!primary) return [];
  return products
    .filter(
      (other) =>
        other.slug !== product.slug && other.categories.some((ref) => ref.category === primary),
    )
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

/** Homepage Best Sellers: featured products first, then products tagged "bestseller". */
export function bestSellers(products: Product[], limit = 8): Product[] {
  return products
    .filter((product) => product.featured || product.tags.includes("bestseller"))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.popularity - a.popularity)
    .slice(0, limit);
}

/** Homepage New In: products tagged "new", newest first. */
export function newArrivals(products: Product[], limit = 8): Product[] {
  return products
    .filter((product) => product.tags.includes("new"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

function categoryNames(categories: Category[], product: Product): string[] {
  return product.categories.flatMap((ref) => {
    const category = getCategory(categories, ref.category);
    if (!category) return [];
    const path = ref.subcategory ? findSubcategoryPath(category, ref.subcategory) : undefined;
    return [category.name, ...(path ?? []).map((node) => node.name)];
  });
}

function tokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word in the query must appear in the product's name, brand or categories. */
export function searchProducts({ categories, products }: Catalog, query: string): Product[] {
  const words = tokens(query);
  if (words.length === 0) return products;
  return products.filter((product) => {
    const haystack = [product.name, product.brand, ...categoryNames(categories, product)]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export type CategoryMatch = { name: string; href: string; parent?: string };

function flatten(category: Category): CategoryMatch[] {
  const walk = (node: Subcategory): CategoryMatch[] =>
    (node.children ?? []).flatMap((child) => [
      {
        name: child.name,
        href: `${categoryHref(category.slug)}/${child.slug}`,
        parent: category.name,
      },
      ...walk(child),
    ]);
  return [{ name: category.name, href: categoryHref(category.slug) }, ...walk(category)];
}

export function searchCategories(categories: Category[], query: string): CategoryMatch[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  return categories
    .flatMap(flatten)
    .filter((match) => words.every((word) => match.name.toLowerCase().includes(word)));
}
