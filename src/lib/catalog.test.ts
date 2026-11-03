import { describe, expect, it } from "vitest";

import { products as sampleProducts } from "../../prisma/sample-data/products";
import {
  allSubcategorySlugs,
  bestSellers,
  findSubcategoryPath,
  getCategory as findCategory,
  newArrivals,
  productsInCategory as inCategory,
  relatedProducts as relatedIn,
  searchCategories as findCategories,
  searchProducts as find,
} from "@/lib/catalog";
import { buildCatalog } from "@/lib/catalog-build";
import type { Category, Product, Subcategory } from "@/lib/catalog-types";
import { sampleCatalog, sampleRows } from "@/test/sample-catalog";

const catalog = sampleCatalog();
const { categories, products } = catalog;
const getCategory = (slug: string) => findCategory(categories, slug);
const productsInCategory = (category: Category, sub?: Subcategory) =>
  inCategory(products, category, sub);
const relatedProducts = (product: Product) => relatedIn(products, product);
const searchProducts = (query: string) => find(catalog, query);
const searchCategories = (query: string) => findCategories(categories, query);

describe("sample data", () => {
  it("only references categories and subcategories that exist", () => {
    for (const product of sampleProducts) {
      for (const ref of product.categories) {
        const category = getCategory(ref.category);
        expect(category, `${product.slug} -> ${ref.category}`).toBeDefined();
        if (ref.subcategory) {
          expect(allSubcategorySlugs(category!), product.slug).toContain(ref.subcategory);
        }
      }
    }
  });

  it("stores whole-kobo prices and unique identifiers", () => {
    const variants = sampleProducts.flatMap((product) => product.variants);
    expect(variants.every((variant) => Number.isSafeInteger(variant.priceKobo))).toBe(true);
    expect(new Set(variants.map((variant) => variant.sku)).size).toBe(variants.length);
    expect(new Set(sampleProducts.map((product) => product.slug)).size).toBe(sampleProducts.length);
  });

  it("keeps every sample product through buildCatalog", () => {
    expect(products).toHaveLength(sampleProducts.filter((product) => product.active).length);
    expect(products.every((product) => product.categories.length > 0)).toBe(true);
  });

  it("has at least one product in every top-level category", () => {
    for (const category of categories) {
      expect(productsInCategory(category).length, category.slug).toBeGreaterThan(0);
    }
  });

  it("has unique subcategory slugs within each category", () => {
    for (const category of categories) {
      const slugs = allSubcategorySlugs(category);
      expect(new Set(slugs).size, category.slug).toBe(slugs.length);
    }
  });
});

describe("category lookups", () => {
  const skincare = getCategory("skincare-and-body-care")!;

  it("finds a nested subcategory path", () => {
    expect(findSubcategoryPath(skincare, "body-lotions")?.map((node) => node.slug)).toEqual([
      "body",
      "body-lotions",
    ]);
    expect(findSubcategoryPath(skincare, "nope")).toBeUndefined();
  });

  it("includes descendants when listing a parent subcategory", () => {
    const body = findSubcategoryPath(skincare, "body")![0];
    const slugs = productsInCategory(skincare, body).map((product) => product.slug);
    expect(slugs).toContain("nivea-body-lotion");
    expect(slugs).not.toContain("garnier-micellar-water");
  });

  it("lists a many-to-many product under each of its categories", () => {
    for (const slug of ["bathroom-and-toilet", "personal-care-and-hygiene"]) {
      const listed = productsInCategory(getCategory(slug)!).map((product) => product.slug);
      expect(listed).toContain("dettol-liquid-handwash");
    }
  });
});

describe("relatedProducts", () => {
  it("returns other products from the primary category", () => {
    const product = products[0];
    const related = relatedProducts(product);
    expect(related.length).toBeGreaterThan(0);
    expect(related.map((item) => item.slug)).not.toContain(product.slug);
    expect(
      related.every((item) =>
        item.categories.some((ref) => ref.category === product.categories[0].category),
      ),
    ).toBe(true);
  });
});

describe("buildCatalog", () => {
  it("hides an inactive category, its subtree and the links to it", () => {
    const { categoryRows, productRows } = sampleRows();
    const rows = categoryRows.map((row) =>
      row.id.startsWith("fragrances") ? { ...row, active: false } : row,
    );
    const built = buildCatalog(rows, productRows);
    expect(built.categories.map((category) => category.slug)).not.toContain("fragrances");
    const reed = built.products.find((product) => product.slug === "reed-diffuser")!;
    expect(reed.categories).toEqual([
      { category: "cleaning-and-household", subcategory: "air-fresheners" },
    ]);
    expect(reed.icon).toBe("SprayCan");
  });

  it("orders categories by sortOrder and drops products with no variants", () => {
    const { categoryRows, productRows } = sampleRows();
    const rows = categoryRows.map((row) => (row.id === "laundry" ? { ...row, sortOrder: -1 } : row));
    const withEmpty = [...productRows, { ...productRows[0], slug: "empty", variants: [] }];
    const built = buildCatalog(rows, withEmpty);
    expect(built.categories[0].slug).toBe("laundry");
    expect(built.products.some((product) => product.slug === "empty")).toBe(false);
  });

  it("falls back to the product name for missing alt text and to a default icon", () => {
    const { productRows } = sampleRows();
    const row = { ...productRows[0], categories: [], images: [{ url: "https://x/a.webp", alt: "" }] };
    const [product] = buildCatalog([], [row]).products;
    expect(product.images[0].alt).toBe(row.name);
    expect(product.icon).toBe("PackageOpen");
  });
});

describe("homepage rows", () => {
  it("puts featured products first in Best Sellers, even untagged ones", () => {
    const featured = { ...products.find((product) => product.tags.length === 0)!, featured: true };
    const rows = bestSellers([...products.filter((p) => p.slug !== featured.slug), featured]);
    expect(rows[0].slug).toBe(featured.slug);
    expect(rows.slice(1).every((product) => product.tags.includes("bestseller"))).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(8);
  });

  it("lists New In newest first", () => {
    const rows = newArrivals(products);
    expect(rows.every((product) => product.tags.includes("new"))).toBe(true);
    const dates = rows.map((product) => product.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("search", () => {
  it("is case-insensitive and needs every word", () => {
    expect(searchProducts("NIVEA lotion").map((product) => product.slug)).toEqual([
      "nivea-body-lotion",
    ]);
  });

  it("matches on category names", () => {
    expect(searchProducts("diapers").map((product) => product.slug)).toContain(
      "molfix-baby-diapers",
    );
  });

  it("returns everything for a blank query and nothing for gibberish", () => {
    expect(searchProducts("   ").length).toBeGreaterThan(0);
    expect(searchProducts("zzzqqq")).toEqual([]);
  });

  it("finds categories and subcategories", () => {
    expect(searchCategories("laundry").map((match) => match.href)).toContain("/category/laundry");
    expect(searchCategories("lotions")[0].href).toBe(
      "/category/skincare-and-body-care/body-lotions",
    );
    expect(searchCategories("")).toEqual([]);
  });
});
