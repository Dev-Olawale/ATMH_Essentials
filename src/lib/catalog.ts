import { categories, categoryHref, type Category, type Subcategory } from "@/data/categories";
import { products, type Product } from "@/data/products";

const activeProducts = products.filter((product) => product.active);

export function getAllProducts(): Product[] {
  return activeProducts;
}

export function getProduct(slug: string): Product | undefined {
  return activeProducts.find((product) => product.slug === slug);
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
export function productsInCategory(category: Category, subcategory?: Subcategory): Product[] {
  const allowed = subcategory ? new Set(descendantSlugs(subcategory)) : undefined;
  return activeProducts.filter((product) =>
    product.categories.some(
      (ref) =>
        ref.category === category.slug &&
        (!allowed || (ref.subcategory !== undefined && allowed.has(ref.subcategory))),
    ),
  );
}

export function relatedProducts(product: Product, limit = 4): Product[] {
  const primary = product.categories[0]?.category;
  return activeProducts
    .filter(
      (other) =>
        other.slug !== product.slug && other.categories.some((ref) => ref.category === primary),
    )
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

function categoryNames(product: Product): string[] {
  return product.categories.flatMap((ref) => {
    const category = categories.find((candidate) => candidate.slug === ref.category);
    if (!category) return [];
    const path = ref.subcategory ? findSubcategoryPath(category, ref.subcategory) : undefined;
    return [category.name, ...(path ?? []).map((node) => node.name)];
  });
}

function tokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word in the query must appear in the product's name, brand or categories. */
export function searchProducts(query: string): Product[] {
  const words = tokens(query);
  if (words.length === 0) return activeProducts;
  return activeProducts.filter((product) => {
    const haystack = [product.name, product.brand, ...categoryNames(product)].join(" ").toLowerCase();
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

export function searchCategories(query: string): CategoryMatch[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  return categories
    .flatMap(flatten)
    .filter((match) => words.every((word) => match.name.toLowerCase().includes(word)));
}
