import { describe, expect, it } from "vitest";

import { allSubcategorySlugs, findSubcategoryPath, productsInCategory } from "@/lib/catalog";
import { catalogueCatalog, parseCatalogueCsv } from "@/test/catalogue";

/** Checks on data/catalogue.csv, the real starting catalogue loaded by scripts/load-catalogue.ts. */
const parsed = parseCatalogueCsv();
const { categories, products } = catalogueCatalog();

describe("data/catalogue.csv", () => {
  it("is valid import data: no errors, known categories, unique SKUs", () => {
    expect(parsed.errors).toEqual([]);
    const skus = parsed.products.flatMap((product) => product.variants.map((variant) => variant.sku));
    expect(new Set(skus).size).toBe(skus.length);
    expect(parsed.products.every((product) => (product.categoryIds?.length ?? 0) > 0)).toBe(true);
  });

  it("has at least 12 products in every top-level category", () => {
    for (const category of categories) {
      expect(productsInCategory(products, category).length, category.slug).toBeGreaterThanOrEqual(12);
    }
  });

  it("has at least 3 products in every subcategory", () => {
    for (const category of categories) {
      for (const slug of allSubcategorySlugs(category)) {
        const node = findSubcategoryPath(category, slug)!.at(-1)!;
        expect(productsInCategory(products, category, node).length, `${category.slug}/${slug}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("has whole-kobo, positive prices and 20 in stock per option", () => {
    const variants = parsed.products.flatMap((product) => product.variants);
    expect(variants.every((variant) => Number.isSafeInteger(variant.priceKobo) && variant.priceKobo > 0)).toBe(true);
    expect(variants.every((variant) => variant.stockQty === 20)).toBe(true);
  });

  it("contains no products banned in Nigeria (e.g. DDVP / dichlorvos 'Sniper')", () => {
    const text = parsed.products.map((product) => `${product.name} ${product.brand} ${product.description}`).join(" ");
    expect(text).not.toMatch(/sniper|ddvp|dichlorvos/i);
  });

  it("uses no made-up placeholder brands", () => {
    const brands = new Set(parsed.products.map((product) => product.brand ?? ""));
    // Softcare and Rose Plus are real Nigerian brands; these were placeholders.
    for (const madeUp of ["HomeBasics", "Bakeway", "Scent Studio", "GroomWell", "Rose"]) {
      expect(brands.has(madeUp), madeUp).toBe(false);
    }
  });

  it("tags enough bestsellers and new arrivals to fill the homepage rows", () => {
    expect(products.filter((product) => product.tags.includes("bestseller")).length).toBeGreaterThanOrEqual(8);
    expect(products.filter((product) => product.tags.includes("new")).length).toBeGreaterThanOrEqual(8);
  });
});
