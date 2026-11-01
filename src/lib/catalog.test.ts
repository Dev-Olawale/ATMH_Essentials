import { describe, expect, it } from "vitest";

import { categories, getCategory } from "@/data/categories";
import { products } from "@/data/products";
import {
  allSubcategorySlugs,
  findSubcategoryPath,
  productsInCategory,
  relatedProducts,
  searchCategories,
  searchProducts,
} from "@/lib/catalog";

describe("sample data", () => {
  it("only references categories and subcategories that exist", () => {
    for (const product of products) {
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
    const variants = products.flatMap((product) => product.variants);
    expect(variants.every((variant) => Number.isSafeInteger(variant.priceKobo))).toBe(true);
    expect(new Set(variants.map((variant) => variant.sku)).size).toBe(variants.length);
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
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
